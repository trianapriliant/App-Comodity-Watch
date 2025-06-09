"""Prophet model untuk time series forecasting."""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pickle
import warnings

try:
    from prophet import Prophet
    from prophet.diagnostics import cross_validation, performance_metrics
    from prophet.plot import plot_cross_validation_metric
except ImportError:
    print("Prophet not installed. Please install with: pip install prophet")
    Prophet = None

from app.config.logging import ml_logger
from app.config.settings import settings

warnings.filterwarnings('ignore')


class ProphetForecaster:
    """Prophet-based price forecasting model."""
    
    def __init__(
        self,
        commodity_code: str,
        region_code: str = None,
        seasonality_mode: str = None,
        yearly_seasonality: bool = None,
        weekly_seasonality: bool = None,
        daily_seasonality: bool = None
    ):
        self.commodity_code = commodity_code
        self.region_code = region_code
        self.model = None
        self.is_fitted = False
        self.feature_columns = []
        self.model_metadata = {}
        
        # Prophet parameters
        self.seasonality_mode = seasonality_mode or settings.prophet_seasonality_mode
        self.yearly_seasonality = yearly_seasonality if yearly_seasonality is not None else settings.prophet_yearly_seasonality
        self.weekly_seasonality = weekly_seasonality if weekly_seasonality is not None else settings.prophet_weekly_seasonality
        self.daily_seasonality = daily_seasonality if daily_seasonality is not None else settings.prophet_daily_seasonality
        
        # Initialize Prophet model
        if Prophet is not None:
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize Prophet model with Indonesian-specific configurations."""
        
        # Create Prophet model
        self.model = Prophet(
            seasonality_mode=self.seasonality_mode,
            yearly_seasonality=self.yearly_seasonality,
            weekly_seasonality=self.weekly_seasonality,
            daily_seasonality=self.daily_seasonality,
            uncertainty_samples=settings.prophet_uncertainty_samples,
            changepoint_prior_scale=0.05,  # Default flexibility
            seasonality_prior_scale=10.0,
            holidays_prior_scale=10.0,
            mcmc_samples=0,  # Use MAP estimation for speed
            interval_width=0.8,
            growth='linear'
        )
        
        # Add Indonesian holidays
        holidays_df = self._create_indonesian_holidays()
        if not holidays_df.empty:
            self.model.add_seasonality(
                name='monthly',
                period=30.5,
                fourier_order=5
            )
        
        ml_logger.info(
            "Prophet model initialized",
            commodity_code=self.commodity_code,
            region_code=self.region_code,
            seasonality_mode=self.seasonality_mode
        )
    
    def _create_indonesian_holidays(self) -> pd.DataFrame:
        """Create Indonesian holidays dataframe for Prophet."""
        
        # Sample holidays (in real implementation, use proper holiday calendar)
        holidays = []
        
        # Fixed holidays
        for year in range(2020, 2030):
            holidays.extend([
                {'holiday': 'new_year', 'ds': f'{year}-01-01', 'lower_window': 0, 'upper_window': 1},
                {'holiday': 'labour_day', 'ds': f'{year}-05-01', 'lower_window': 0, 'upper_window': 1},
                {'holiday': 'pancasila_day', 'ds': f'{year}-06-01', 'lower_window': 0, 'upper_window': 1},
                {'holiday': 'independence_day', 'ds': f'{year}-08-17', 'lower_window': -1, 'upper_window': 1},
                {'holiday': 'christmas', 'ds': f'{year}-12-25', 'lower_window': -1, 'upper_window': 1},
            ])
        
        # Variable holidays (simplified - in reality use Islamic calendar)
        # These dates are approximate and would need proper calculation
        ramadan_dates = {
            2024: ['04-10', '04-11'],  # Eid al-Fitr
            2025: ['03-30', '03-31'],
        }
        
        for year, dates in ramadan_dates.items():
            for date in dates:
                holidays.append({
                    'holiday': 'eid_fitr',
                    'ds': f'{year}-{date}',
                    'lower_window': -1,
                    'upper_window': 1
                })
        
        holidays_df = pd.DataFrame(holidays)
        holidays_df['ds'] = pd.to_datetime(holidays_df['ds'])
        
        return holidays_df
    
    def prepare_data(self, df: pd.DataFrame, target_col: str = 'price') -> pd.DataFrame:
        """Prepare data for Prophet training."""
        
        # Prophet requires specific column names
        prophet_df = df.copy()
        
        # Ensure we have required columns
        if 'date' not in prophet_df.columns:
            raise ValueError("Data must have 'date' column")
        
        if target_col not in prophet_df.columns:
            raise ValueError(f"Target column '{target_col}' not found in data")
        
        # Rename columns for Prophet
        prophet_df = prophet_df.rename(columns={
            'date': 'ds',
            target_col: 'y'
        })
        
        # Ensure datetime format
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
        
        # Sort by date
        prophet_df = prophet_df.sort_values('ds')
        
        # Remove duplicates
        prophet_df = prophet_df.drop_duplicates(subset=['ds'])
        
        # Add regressors (external features)
        self._add_regressors(prophet_df)
        
        return prophet_df
    
    def _add_regressors(self, df: pd.DataFrame):
        """Add external regressors to Prophet model."""
        
        # Weather regressors
        weather_cols = [col for col in df.columns if col.startswith('weather_')]
        for col in weather_cols:
            if not df[col].isnull().all():
                try:
                    self.model.add_regressor(col, prior_scale=0.5)
                    self.feature_columns.append(col)
                except:
                    pass
        
        # Technical indicator regressors
        technical_cols = [
            col for col in df.columns 
            if any(indicator in col for indicator in ['ma_', 'rsi', 'volatility_', 'momentum_'])
        ]
        for col in technical_cols[:10]:  # Limit to prevent overfitting
            if not df[col].isnull().all():
                try:
                    self.model.add_regressor(col, prior_scale=0.1)
                    self.feature_columns.append(col)
                except:
                    pass
        
        # Seasonal regressors
        seasonal_cols = [col for col in df.columns if 'season' in col or 'harvest' in col]
        for col in seasonal_cols:
            if not df[col].isnull().all():
                try:
                    self.model.add_regressor(col, prior_scale=1.0)
                    self.feature_columns.append(col)
                except:
                    pass
    
    def fit(self, df: pd.DataFrame, target_col: str = 'price') -> Dict:
        """Train Prophet model."""
        
        try:
            # Prepare data
            prophet_df = self.prepare_data(df, target_col)
            
            # Validate data
            if len(prophet_df) < 30:
                raise ValueError("Need at least 30 data points for training")
            
            # Fit model
            ml_logger.info(
                "Starting Prophet model training",
                commodity_code=self.commodity_code,
                samples=len(prophet_df),
                features=len(self.feature_columns)
            )
            
            self.model.fit(prophet_df)
            self.is_fitted = True
            
            # Calculate training metrics
            training_metrics = self._calculate_training_metrics(prophet_df)
            
            # Store metadata
            self.model_metadata = {
                'commodity_code': self.commodity_code,
                'region_code': self.region_code,
                'training_date': datetime.now().isoformat(),
                'training_samples': len(prophet_df),
                'feature_columns': self.feature_columns,
                'date_range': {
                    'start': prophet_df['ds'].min().isoformat(),
                    'end': prophet_df['ds'].max().isoformat()
                },
                'model_parameters': {
                    'seasonality_mode': self.seasonality_mode,
                    'yearly_seasonality': self.yearly_seasonality,
                    'weekly_seasonality': self.weekly_seasonality,
                    'daily_seasonality': self.daily_seasonality
                },
                'training_metrics': training_metrics
            }
            
            ml_logger.info(
                "Prophet model training completed",
                commodity_code=self.commodity_code,
                training_metrics=training_metrics
            )
            
            return training_metrics
            
        except Exception as e:
            ml_logger.error(
                "Prophet model training failed",
                commodity_code=self.commodity_code,
                error=str(e)
            )
            raise e
    
    def _calculate_training_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate training metrics."""
        
        try:
            # In-sample predictions
            forecast = self.model.predict(df)
            
            y_true = df['y'].values
            y_pred = forecast['yhat'].values
            
            # Calculate metrics
            mae = np.mean(np.abs(y_true - y_pred))
            rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
            mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
            
            # R-squared
            ss_res = np.sum((y_true - y_pred) ** 2)
            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
            r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            
            metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape),
                'r2': float(r2),
                'mean_price': float(np.mean(y_true)),
                'std_price': float(np.std(y_true))
            }
            
            return metrics
            
        except Exception as e:
            ml_logger.warning("Failed to calculate training metrics", error=str(e))
            return {}
    
    def predict(
        self,
        future_df: pd.DataFrame = None,
        horizon_days: int = 7,
        include_history: bool = False
    ) -> pd.DataFrame:
        """Make predictions with Prophet model."""
        
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        try:
            if future_df is None:
                # Create future dataframe
                future_df = self.model.make_future_dataframe(
                    periods=horizon_days,
                    freq='D',
                    include_history=include_history
                )
                
                # Add regressor values for future dates
                future_df = self._add_future_regressors(future_df)
            
            # Make predictions
            forecast = self.model.predict(future_df)
            
            # Add metadata
            forecast['commodity_code'] = self.commodity_code
            forecast['region_code'] = self.region_code
            forecast['model_type'] = 'prophet'
            
            # Calculate confidence intervals
            forecast['confidence'] = self._calculate_confidence_scores(forecast)
            
            return forecast
            
        except Exception as e:
            ml_logger.error(
                "Prophet prediction failed",
                commodity_code=self.commodity_code,
                error=str(e)
            )
            raise e
    
    def _add_future_regressors(self, future_df: pd.DataFrame) -> pd.DataFrame:
        """Add regressor values for future dates."""
        
        for col in self.feature_columns:
            if col not in future_df.columns:
                # Simple forward fill for missing regressors
                # In production, this should use proper forecasting for each regressor
                if col.startswith('weather_'):
                    # Weather features - use seasonal patterns
                    future_df[col] = self._generate_weather_forecast(future_df['ds'], col)
                elif 'ma_' in col or 'volatility_' in col:
                    # Technical indicators - use last known values
                    future_df[col] = 0  # Placeholder
                else:
                    # Other features
                    future_df[col] = 0
        
        return future_df
    
    def _generate_weather_forecast(self, dates: pd.Series, weather_col: str) -> pd.Series:
        """Generate simple weather forecast for future dates."""
        
        # Simple seasonal pattern (placeholder)
        day_of_year = dates.dt.dayofyear
        
        if 'temperature' in weather_col.lower():
            # Temperature pattern for Indonesia (tropical)
            base_temp = 27 + 3 * np.sin(2 * np.pi * day_of_year / 365)
            return base_temp + np.random.normal(0, 1, len(dates))
        elif 'rainfall' in weather_col.lower():
            # Rainfall pattern (wet/dry seasons)
            wet_season = ((day_of_year >= 300) | (day_of_year <= 90)).astype(int)
            return wet_season * 5 + np.random.exponential(2, len(dates))
        elif 'humidity' in weather_col.lower():
            # Humidity pattern
            base_humidity = 70 + 10 * np.sin(2 * np.pi * day_of_year / 365)
            return base_humidity + np.random.normal(0, 5, len(dates))
        else:
            return pd.Series(0, index=dates.index)
    
    def _calculate_confidence_scores(self, forecast: pd.DataFrame) -> pd.Series:
        """Calculate confidence scores for predictions."""
        
        # Use uncertainty intervals to calculate confidence
        yhat = forecast['yhat']
        yhat_lower = forecast['yhat_lower']
        yhat_upper = forecast['yhat_upper']
        
        # Confidence based on interval width (normalized)
        interval_width = yhat_upper - yhat_lower
        max_width = interval_width.max()
        
        if max_width > 0:
            confidence = 1 - (interval_width / max_width)
        else:
            confidence = pd.Series(0.8, index=forecast.index)  # Default confidence
        
        # Ensure confidence is between 0 and 1
        confidence = confidence.clip(0, 1)
        
        return confidence
    
    def cross_validate(
        self,
        df: pd.DataFrame,
        horizon: str = '30 days',
        initial: str = '365 days',
        period: str = '90 days'
    ) -> pd.DataFrame:
        """Perform cross-validation."""
        
        if not self.is_fitted:
            raise ValueError("Model must be fitted before cross-validation")
        
        try:
            prophet_df = self.prepare_data(df)
            
            # Perform cross-validation
            cv_results = cross_validation(
                self.model,
                horizon=horizon,
                initial=initial,
                period=period,
                parallel="processes"
            )
            
            # Calculate performance metrics
            metrics = performance_metrics(cv_results)
            
            ml_logger.info(
                "Cross-validation completed",
                commodity_code=self.commodity_code,
                cv_samples=len(cv_results),
                mean_mape=float(metrics['mape'].mean())
            )
            
            return cv_results, metrics
            
        except Exception as e:
            ml_logger.error("Cross-validation failed", error=str(e))
            raise e
    
    def save_model(self, filepath: str):
        """Save trained model."""
        
        if not self.is_fitted:
            raise ValueError("Model must be fitted before saving")
        
        try:
            model_data = {
                'model': self.model,
                'metadata': self.model_metadata,
                'feature_columns': self.feature_columns,
                'commodity_code': self.commodity_code,
                'region_code': self.region_code,
                'is_fitted': self.is_fitted
            }
            
            with open(filepath, 'wb') as f:
                pickle.dump(model_data, f)
            
            ml_logger.info(
                "Prophet model saved",
                commodity_code=self.commodity_code,
                filepath=filepath
            )
            
        except Exception as e:
            ml_logger.error("Failed to save model", error=str(e))
            raise e
    
    def load_model(self, filepath: str):
        """Load trained model."""
        
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.model_metadata = model_data['metadata']
            self.feature_columns = model_data['feature_columns']
            self.commodity_code = model_data['commodity_code']
            self.region_code = model_data['region_code']
            self.is_fitted = model_data['is_fitted']
            
            ml_logger.info(
                "Prophet model loaded",
                commodity_code=self.commodity_code,
                filepath=filepath
            )
            
        except Exception as e:
            ml_logger.error("Failed to load model", error=str(e))
            raise e
    
    def get_model_info(self) -> Dict:
        """Get model information."""
        
        return {
            'model_type': 'prophet',
            'commodity_code': self.commodity_code,
            'region_code': self.region_code,
            'is_fitted': self.is_fitted,
            'feature_count': len(self.feature_columns),
            'metadata': self.model_metadata
        }
