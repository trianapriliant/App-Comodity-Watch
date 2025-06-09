"""Data preprocessing untuk ML pipeline."""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union
from sklearn.preprocessing import LabelEncoder
import warnings

from app.config.database import db_manager
from app.config.logging import ml_logger
from app.config.settings import settings

warnings.filterwarnings('ignore')


class DataProcessor:
    """Data processor untuk ML pipeline."""
    
    def __init__(self):
        self.label_encoders = {}
        self.data_quality_metrics = {}
        
    def load_and_preprocess_data(
        self,
        commodity_codes: List[str] = None,
        region_codes: List[str] = None,
        start_date: str = None,
        end_date: str = None,
        include_weather: bool = True
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Load dan preprocess data dari database."""
        
        try:
            # Load price data
            price_data = db_manager.get_price_data(
                commodity_codes=commodity_codes,
                region_codes=region_codes,
                start_date=start_date,
                end_date=end_date
            )
            
            if price_data.empty:
                raise ValueError("No price data found for given criteria")
            
            # Load weather data if requested
            weather_data = pd.DataFrame()
            if include_weather:
                weather_data = db_manager.get_weather_data(
                    region_codes=region_codes,
                    start_date=start_date,
                    end_date=end_date
                )
            
            # Preprocess price data
            price_data = self._preprocess_price_data(price_data)
            
            # Preprocess weather data
            if not weather_data.empty:
                weather_data = self._preprocess_weather_data(weather_data)
            
            # Validate data quality
            self._validate_data_quality(price_data, weather_data)
            
            ml_logger.info(
                "Data loaded and preprocessed successfully",
                price_records=len(price_data),
                weather_records=len(weather_data),
                date_range={
                    "start": price_data['date'].min().isoformat() if not price_data.empty else None,
                    "end": price_data['date'].max().isoformat() if not price_data.empty else None
                }
            )
            
            return price_data, weather_data
            
        except Exception as e:
            ml_logger.error("Failed to load and preprocess data", error=str(e))
            raise e
    
    def _preprocess_price_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Preprocess price data."""
        
        # Copy to avoid modifying original
        df = df.copy()
        
        # Ensure datetime format
        df['date'] = pd.to_datetime(df['date'])
        
        # Sort by date
        df = df.sort_values(['commodity_code', 'region_code', 'date'])
        
        # Remove invalid prices
        df = df[df['price'] > 0]
        
        # Handle currency conversion (if needed)
        if 'currency' in df.columns:
            # Convert all to IDR (assuming most data is already in IDR)
            df = df[df['currency'] == 'IDR']
        
        # Remove extreme outliers using IQR method per commodity-region
        df = self._remove_price_outliers(df)
        
        # Fill missing dates and interpolate prices
        df = self._fill_missing_dates(df)
        
        # Add derived price features
        df = self._add_price_derivatives(df)
        
        return df
    
    def _preprocess_weather_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Preprocess weather data."""
        
        if df.empty:
            return df
        
        # Copy to avoid modifying original
        df = df.copy()
        
        # Ensure datetime format
        df['date'] = pd.to_datetime(df['date'])
        
        # Sort by date
        df = df.sort_values(['region_code', 'weather_type', 'date'])
        
        # Remove invalid weather values
        df = self._clean_weather_values(df)
        
        # Standardize weather types
        df = self._standardize_weather_types(df)
        
        # Fill missing weather data
        df = self._fill_missing_weather(df)
        
        return df
    
    def _remove_price_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove price outliers using statistical methods."""
        
        cleaned_df = pd.DataFrame()
        
        for (commodity, region), group in df.groupby(['commodity_code', 'region_code']):
            # Calculate IQR
            Q1 = group['price'].quantile(0.25)
            Q3 = group['price'].quantile(0.75)
            IQR = Q3 - Q1
            
            # Define outlier bounds
            lower_bound = Q1 - 2.5 * IQR  # More conservative than 1.5
            upper_bound = Q3 + 2.5 * IQR
            
            # Filter outliers
            group_cleaned = group[
                (group['price'] >= lower_bound) & 
                (group['price'] <= upper_bound)
            ]
            
            cleaned_df = pd.concat([cleaned_df, group_cleaned])
        
        outliers_removed = len(df) - len(cleaned_df)
        if outliers_removed > 0:
            ml_logger.info(f"Removed {outliers_removed} price outliers")
        
        return cleaned_df.reset_index(drop=True)
    
    def _fill_missing_dates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fill missing dates and interpolate prices."""
        
        filled_df = pd.DataFrame()
        
        for (commodity, region), group in df.groupby(['commodity_code', 'region_code']):
            # Create date range
            date_range = pd.date_range(
                start=group['date'].min(),
                end=group['date'].max(),
                freq='D'
            )
            
            # Reindex to include all dates
            group_indexed = group.set_index('date').reindex(date_range)
            
            # Fill metadata columns
            group_indexed['commodity_code'] = commodity
            group_indexed['region_code'] = region
            
            # Forward fill then backward fill for categorical columns
            categorical_cols = ['commodity_name', 'region_name', 'price_type', 'currency']
            for col in categorical_cols:
                if col in group_indexed.columns:
                    group_indexed[col] = group_indexed[col].fillna(method='ffill').fillna(method='bfill')
            
            # Interpolate prices
            group_indexed['price'] = group_indexed['price'].interpolate(method='linear')
            
            # Reset index to get date as column
            group_indexed = group_indexed.reset_index().rename(columns={'index': 'date'})
            
            filled_df = pd.concat([filled_df, group_indexed])
        
        return filled_df.reset_index(drop=True)
    
    def _add_price_derivatives(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add derived price features."""
        
        # Add price change and percentage change
        df = df.sort_values(['commodity_code', 'region_code', 'date'])
        
        df['price_change'] = df.groupby(['commodity_code', 'region_code'])['price'].diff()
        df['price_pct_change'] = df.groupby(['commodity_code', 'region_code'])['price'].pct_change()
        
        # Add 7-day and 30-day price changes
        df['price_change_7d'] = df.groupby(['commodity_code', 'region_code'])['price'].diff(7)
        df['price_change_30d'] = df.groupby(['commodity_code', 'region_code'])['price'].diff(30)
        
        # Add log prices for better model performance
        df['log_price'] = np.log(df['price'])
        df['log_price_change'] = df.groupby(['commodity_code', 'region_code'])['log_price'].diff()
        
        return df
    
    def _clean_weather_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean weather values."""
        
        # Remove invalid weather values based on type
        weather_bounds = {
            'TEMPERATURE': (-10, 50),  # Celsius
            'HUMIDITY': (0, 100),      # Percentage
            'RAINFALL': (0, 1000),     # mm per day
            'WIND_SPEED': (0, 100),    # m/s
            'PRESSURE': (800, 1200),   # hPa
        }
        
        for weather_type, (min_val, max_val) in weather_bounds.items():
            mask = (df['weather_type'] == weather_type)
            df = df[~mask | ((df['value'] >= min_val) & (df['value'] <= max_val))]
        
        return df
    
    def _standardize_weather_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize weather type names."""
        
        weather_type_mapping = {
            'temp': 'TEMPERATURE',
            'temperature': 'TEMPERATURE',
            'humid': 'HUMIDITY',
            'humidity': 'HUMIDITY',
            'rh': 'HUMIDITY',
            'rain': 'RAINFALL',
            'rainfall': 'RAINFALL',
            'precipitation': 'RAINFALL',
            'wind': 'WIND_SPEED',
            'wind_speed': 'WIND_SPEED',
            'press': 'PRESSURE',
            'pressure': 'PRESSURE',
            'mslp': 'PRESSURE',
        }
        
        # Standardize weather types
        df['weather_type'] = df['weather_type'].str.upper()
        for old_type, new_type in weather_type_mapping.items():
            df['weather_type'] = df['weather_type'].str.replace(old_type.upper(), new_type)
        
        return df
    
    def _fill_missing_weather(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fill missing weather data."""
        
        if df.empty:
            return df
        
        filled_df = pd.DataFrame()
        
        for (region, weather_type), group in df.groupby(['region_code', 'weather_type']):
            # Create date range
            if not group.empty:
                date_range = pd.date_range(
                    start=group['date'].min(),
                    end=group['date'].max(),
                    freq='D'
                )
                
                # Reindex to include all dates
                group_indexed = group.set_index('date').reindex(date_range)
                
                # Fill metadata
                group_indexed['region_code'] = region
                group_indexed['weather_type'] = weather_type
                
                # Interpolate weather values
                group_indexed['value'] = group_indexed['value'].interpolate(method='linear')
                
                # Fill remaining NaNs with median
                group_indexed['value'] = group_indexed['value'].fillna(group['value'].median())
                
                # Reset index
                group_indexed = group_indexed.reset_index().rename(columns={'index': 'date'})
                
                filled_df = pd.concat([filled_df, group_indexed])
        
        return filled_df.reset_index(drop=True)
    
    def _validate_data_quality(self, price_data: pd.DataFrame, weather_data: pd.DataFrame) -> None:
        """Validate data quality and log metrics."""
        
        quality_metrics = {}
        
        # Price data quality
        if not price_data.empty:
            price_quality = {
                'total_records': len(price_data),
                'unique_commodities': price_data['commodity_code'].nunique(),
                'unique_regions': price_data['region_code'].nunique(),
                'date_range_days': (price_data['date'].max() - price_data['date'].min()).days,
                'missing_prices': price_data['price'].isnull().sum(),
                'zero_prices': (price_data['price'] == 0).sum(),
                'negative_prices': (price_data['price'] < 0).sum(),
            }
            
            price_quality['completeness'] = 1 - (price_quality['missing_prices'] / price_quality['total_records'])
            quality_metrics['price_data'] = price_quality
        
        # Weather data quality
        if not weather_data.empty:
            weather_quality = {
                'total_records': len(weather_data),
                'unique_regions': weather_data['region_code'].nunique(),
                'unique_weather_types': weather_data['weather_type'].nunique(),
                'missing_values': weather_data['value'].isnull().sum(),
            }
            
            weather_quality['completeness'] = 1 - (weather_quality['missing_values'] / weather_quality['total_records'])
            quality_metrics['weather_data'] = weather_quality
        
        # Store metrics
        self.data_quality_metrics = quality_metrics
        
        # Log quality metrics
        ml_logger.info("Data quality validation completed", **quality_metrics)
        
        # Warn if quality is low
        if price_data.empty:
            ml_logger.warning("No valid price data available")
        elif quality_metrics.get('price_data', {}).get('completeness', 0) < 0.8:
            ml_logger.warning(
                "Low price data completeness",
                completeness=quality_metrics['price_data']['completeness']
            )
    
    def create_train_test_split(
        self,
        df: pd.DataFrame,
        test_size: float = 0.2,
        time_based: bool = True
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Create train/test split."""
        
        if time_based:
            # Time-based split (more realistic for time series)
            df_sorted = df.sort_values('date')
            split_idx = int(len(df_sorted) * (1 - test_size))
            
            train_df = df_sorted.iloc[:split_idx].copy()
            test_df = df_sorted.iloc[split_idx:].copy()
        else:
            # Random split
            test_df = df.sample(frac=test_size, random_state=42)
            train_df = df.drop(test_df.index)
        
        ml_logger.info(
            "Train/test split created",
            train_samples=len(train_df),
            test_samples=len(test_df),
            split_type="time_based" if time_based else "random"
        )
        
        return train_df, test_df
    
    def prepare_model_data(
        self,
        df: pd.DataFrame,
        target_col: str = 'price',
        feature_cols: List[str] = None,
        sequence_length: int = None
    ) -> Dict[str, np.ndarray]:
        """Prepare data for ML models."""
        
        # Copy to avoid modifying original
        df = df.copy()
        
        # Sort by date
        df = df.sort_values('date')
        
        # Select features
        if feature_cols is None:
            # Auto-select numerical features (exclude target and metadata)
            exclude_cols = [target_col, 'date', 'commodity_code', 'region_code', 
                          'commodity_name', 'region_name', 'source', 'id']
            feature_cols = [col for col in df.select_dtypes(include=[np.number]).columns 
                          if col not in exclude_cols]
        
        # Prepare features and target
        X = df[feature_cols].values
        y = df[target_col].values
        
        # Handle sequence data for LSTM
        if sequence_length:
            X_sequences, y_sequences = self._create_sequences(X, y, sequence_length)
            X = X_sequences
            y = y_sequences
        
        # Prepare metadata
        metadata = {
            'dates': df['date'].values,
            'feature_names': feature_cols,
            'target_name': target_col,
            'sequence_length': sequence_length,
            'sample_count': len(X),
            'feature_count': X.shape[-1] if sequence_length else X.shape[1]
        }
        
        return {
            'X': X,
            'y': y,
            'metadata': metadata
        }
    
    def _create_sequences(
        self,
        X: np.ndarray,
        y: np.ndarray,
        sequence_length: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM training."""
        
        X_sequences = []
        y_sequences = []
        
        for i in range(sequence_length, len(X)):
            X_sequences.append(X[i-sequence_length:i])
            y_sequences.append(y[i])
        
        return np.array(X_sequences), np.array(y_sequences)
    
    def get_data_summary(self, df: pd.DataFrame) -> Dict:
        """Get data summary statistics."""
        
        summary = {
            'shape': df.shape,
            'date_range': {
                'start': df['date'].min().isoformat() if 'date' in df.columns else None,
                'end': df['date'].max().isoformat() if 'date' in df.columns else None,
            },
            'commodities': df['commodity_code'].unique().tolist() if 'commodity_code' in df.columns else [],
            'regions': df['region_code'].unique().tolist() if 'region_code' in df.columns else [],
            'missing_values': df.isnull().sum().to_dict(),
            'numerical_summary': df.describe().to_dict() if not df.empty else {},
            'quality_metrics': self.data_quality_metrics
        }
        
        return summary
