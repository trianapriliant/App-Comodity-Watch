"""Feature engineering untuk ML models."""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from scipy import stats
import warnings

from app.config.logging import ml_logger
from app.config.settings import settings

warnings.filterwarnings('ignore')


class FeatureEngineer:
    """Feature engineering class untuk commodity price prediction."""
    
    def __init__(self):
        self.scalers = {}
        self.feature_metadata = {}
        
    def engineer_features(
        self,
        price_data: pd.DataFrame,
        weather_data: pd.DataFrame = None,
        commodity_code: str = None,
        region_code: str = None
    ) -> pd.DataFrame:
        """Engineer features dari price dan weather data."""
        
        try:
            # Copy data untuk avoid modifikasi original
            df = price_data.copy()
            
            # Ensure proper datetime index
            if 'date' in df.columns:
                df = df.set_index('date')
            df.index = pd.to_datetime(df.index)
            
            # Sort by date
            df = df.sort_index()
            
            # Basic preprocessing
            df = self._preprocess_data(df)
            
            # Technical indicators
            df = self._add_technical_indicators(df)
            
            # Seasonal features
            df = self._add_seasonal_features(df)
            
            # Lag features
            df = self._add_lag_features(df)
            
            # Price statistics
            df = self._add_price_statistics(df)
            
            # Volatility features
            df = self._add_volatility_features(df)
            
            # Weather features if available
            if weather_data is not None and not weather_data.empty:
                df = self._add_weather_features(df, weather_data)
            
            # Regional features if multiple regions
            if region_code and 'region_code' in df.columns:
                df = self._add_regional_features(df, region_code)
            
            # External factor features
            df = self._add_external_features(df)
            
            # Clean final dataset
            df = self._clean_features(df)
            
            ml_logger.info(
                "Feature engineering completed",
                commodity_code=commodity_code,
                region_code=region_code,
                features_count=len(df.columns),
                samples_count=len(df)
            )
            
            return df
            
        except Exception as e:
            ml_logger.error(
                "Feature engineering failed",
                commodity_code=commodity_code,
                error=str(e)
            )
            raise e
    
    def _preprocess_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Basic data preprocessing."""
        
        # Remove duplicates
        df = df[~df.index.duplicated(keep='last')]
        
        # Fill missing prices with forward fill then backward fill
        if 'price' in df.columns:
            df['price'] = df['price'].fillna(method='ffill').fillna(method='bfill')
        
        # Remove unrealistic prices (negative or extreme outliers)
        if 'price' in df.columns:
            Q1 = df['price'].quantile(0.25)
            Q3 = df['price'].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 3 * IQR
            upper_bound = Q3 + 3 * IQR
            
            df = df[(df['price'] >= lower_bound) & (df['price'] <= upper_bound)]
        
        return df
    
    def _add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add technical indicators."""
        
        if 'price' not in df.columns:
            return df
        
        price = df['price']
        
        # Moving averages
        for window in settings.moving_average_windows:
            df[f'ma_{window}'] = price.rolling(window=window, min_periods=1).mean()
            df[f'price_ma_{window}_ratio'] = price / df[f'ma_{window}']
        
        # Exponential moving averages
        df['ema_12'] = price.ewm(span=12).mean()
        df['ema_26'] = price.ewm(span=26).mean()
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # RSI (Relative Strength Index)
        delta = price.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        df['bb_middle'] = price.rolling(window=20).mean()
        bb_std = price.rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_width'] = df['bb_upper'] - df['bb_lower']
        df['bb_position'] = (price - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Price momentum
        for period in [1, 3, 7, 14, 30]:
            df[f'momentum_{period}'] = price.pct_change(periods=period)
            df[f'price_change_{period}'] = price.diff(periods=period)
        
        return df
    
    def _add_seasonal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add seasonal and temporal features."""
        
        # Time-based features
        df['year'] = df.index.year
        df['month'] = df.index.month
        df['day'] = df.index.day
        df['day_of_week'] = df.index.dayofweek
        df['day_of_year'] = df.index.dayofyear
        df['week_of_year'] = df.index.isocalendar().week
        df['quarter'] = df.index.quarter
        
        # Cyclical encoding for temporal features
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['day_of_year_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365)
        df['day_of_year_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365)
        
        # Indonesian seasonal patterns
        # Dry season (May-October), Wet season (November-April)
        df['is_dry_season'] = df['month'].isin([5, 6, 7, 8, 9, 10]).astype(int)
        df['is_wet_season'] = df['month'].isin([11, 12, 1, 2, 3, 4]).astype(int)
        
        # Harvest seasons (varies by commodity)
        df['is_rice_harvest'] = df['month'].isin([3, 4, 8, 9]).astype(int)
        df['is_corn_harvest'] = df['month'].isin([4, 5, 9, 10]).astype(int)
        
        # Islamic calendar effects (approximate)
        # Ramadan typically causes price changes
        df['is_ramadan_period'] = 0  # This would need actual Islamic calendar
        
        # Indonesian holidays effect
        df['is_holiday_month'] = df['month'].isin([8, 12]).astype(int)  # Independence, Christmas
        
        return df
    
    def _add_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add lagged features."""
        
        if 'price' not in df.columns:
            return df
        
        price = df['price']
        
        # Lagged prices
        for lag in [1, 2, 3, 7, 14, 30]:
            df[f'price_lag_{lag}'] = price.shift(lag)
        
        # Lagged price changes
        for lag in [1, 7]:
            df[f'price_change_lag_{lag}'] = price.pct_change().shift(lag)
        
        # Lagged moving averages
        for window in [7, 30]:
            ma = price.rolling(window=window).mean()
            df[f'ma_{window}_lag_1'] = ma.shift(1)
        
        return df
    
    def _add_price_statistics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add price statistical features."""
        
        if 'price' not in df.columns:
            return df
        
        price = df['price']
        
        # Rolling statistics
        for window in [7, 14, 30]:
            df[f'price_mean_{window}'] = price.rolling(window=window).mean()
            df[f'price_std_{window}'] = price.rolling(window=window).std()
            df[f'price_min_{window}'] = price.rolling(window=window).min()
            df[f'price_max_{window}'] = price.rolling(window=window).max()
            df[f'price_median_{window}'] = price.rolling(window=window).median()
            df[f'price_range_{window}'] = df[f'price_max_{window}'] - df[f'price_min_{window}']
            
            # Relative position in range
            df[f'price_position_{window}'] = (
                (price - df[f'price_min_{window}']) / 
                (df[f'price_max_{window}'] - df[f'price_min_{window}'])
            )
        
        # Z-score (standardized price)
        for window in [30, 90]:
            mean = price.rolling(window=window).mean()
            std = price.rolling(window=window).std()
            df[f'price_zscore_{window}'] = (price - mean) / std
        
        return df
    
    def _add_volatility_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volatility features."""
        
        if 'price' not in df.columns:
            return df
        
        price = df['price']
        returns = price.pct_change()
        
        # Rolling volatility
        for window in settings.volatility_windows:
            df[f'volatility_{window}'] = returns.rolling(window=window).std()
            df[f'volatility_{window}_annualized'] = df[f'volatility_{window}'] * np.sqrt(252)
        
        # GARCH-like volatility
        df['returns'] = returns
        df['returns_squared'] = returns ** 2
        for window in [7, 30]:
            df[f'garch_vol_{window}'] = df['returns_squared'].rolling(window=window).mean()
        
        # High-low volatility (if high/low data available)
        if 'high' in df.columns and 'low' in df.columns:
            df['hl_volatility'] = np.log(df['high'] / df['low'])
        else:
            # Approximate with price ranges
            for window in [7, 30]:
                high = price.rolling(window=window).max()
                low = price.rolling(window=window).min()
                df[f'hl_volatility_{window}'] = np.log(high / low)
        
        return df
    
    def _add_weather_features(self, df: pd.DataFrame, weather_data: pd.DataFrame) -> pd.DataFrame:
        """Add weather-related features."""
        
        try:
            # Ensure weather data has proper datetime index
            weather_df = weather_data.copy()
            if 'date' in weather_df.columns:
                weather_df = weather_df.set_index('date')
            weather_df.index = pd.to_datetime(weather_df.index)
            
            # Pivot weather data by weather_type
            if 'weather_type' in weather_df.columns:
                weather_pivot = weather_df.pivot_table(
                    index='date',
                    columns='weather_type',
                    values='value',
                    aggfunc='mean'
                )
                
                # Add weather features to main dataframe
                for weather_type in weather_pivot.columns:
                    col_name = f'weather_{weather_type.lower()}'
                    
                    # Align dates and fill missing values
                    weather_series = weather_pivot[weather_type].reindex(df.index)
                    weather_series = weather_series.fillna(method='ffill').fillna(method='bfill')
                    
                    df[col_name] = weather_series
                    
                    # Rolling weather statistics
                    for window in [7, 30]:
                        df[f'{col_name}_mean_{window}'] = weather_series.rolling(window=window).mean()
                        df[f'{col_name}_std_{window}'] = weather_series.rolling(window=window).std()
                    
                    # Weather anomalies
                    weather_mean = weather_series.rolling(window=30).mean()
                    weather_std = weather_series.rolling(window=30).std()
                    df[f'{col_name}_anomaly'] = (weather_series - weather_mean) / weather_std
            
            # Weather-price interaction features
            if 'price' in df.columns:
                for weather_col in [col for col in df.columns if col.startswith('weather_')]:
                    if not weather_col.endswith(('_mean_7', '_mean_30', '_std_7', '_std_30', '_anomaly')):
                        df[f'price_{weather_col}_interaction'] = df['price'] * df[weather_col]
        
        except Exception as e:
            ml_logger.warning("Failed to add weather features", error=str(e))
        
        return df
    
    def _add_regional_features(self, df: pd.DataFrame, target_region: str) -> pd.DataFrame:
        """Add regional comparison features."""
        
        if 'region_code' not in df.columns or 'price' not in df.columns:
            return df
        
        try:
            # Calculate national average price
            national_avg = df.groupby(df.index)['price'].mean()
            df['national_avg_price'] = national_avg.reindex(df.index)
            
            # Price relative to national average
            df['price_vs_national'] = df['price'] / df['national_avg_price']
            
            # Regional price rank
            df['regional_price_rank'] = df.groupby(df.index)['price'].rank(ascending=False)
            
            # Price convergence/divergence
            df['price_divergence'] = df['price'] - df['national_avg_price']
            
        except Exception as e:
            ml_logger.warning("Failed to add regional features", error=str(e))
        
        return df
    
    def _add_external_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add external factor features."""
        
        # Economic indicators (if available)
        # These would typically come from external data sources
        
        # Fuel price proxy (affects transportation costs)
        # Oil price correlation (simplified)
        df['fuel_price_proxy'] = df.index.year * 1000 + df.index.dayofyear
        
        # Exchange rate proxy (affects import costs)
        df['exchange_rate_proxy'] = np.sin(2 * np.pi * df.index.dayofyear / 365) * 100 + 14000
        
        # Global commodity price trends (simplified)
        df['global_trend'] = np.sin(2 * np.pi * df.index.dayofyear / 365) * 0.1
        
        return df
    
    def _clean_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and finalize features."""
        
        # Remove infinite values
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # Fill remaining NaN values
        # For numerical columns, use forward fill then median
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col] = df[col].fillna(method='ffill').fillna(df[col].median())
        
        # Drop columns with too many NaN values (>50%)
        threshold = len(df) * 0.5
        df = df.dropna(axis=1, thresh=threshold)
        
        return df
    
    def get_feature_importance_names(self, df: pd.DataFrame) -> List[str]:
        """Get feature names for importance analysis."""
        
        # Exclude target and identifier columns
        exclude_cols = [
            'price', 'commodity_code', 'region_code', 'commodity_name', 
            'region_name', 'currency', 'source', 'id'
        ]
        
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        return feature_cols
    
    def scale_features(
        self, 
        df: pd.DataFrame, 
        feature_cols: List[str],
        scaler_type: str = 'standard',
        fit_scaler: bool = True
    ) -> pd.DataFrame:
        """Scale features for ML models."""
        
        df_scaled = df.copy()
        
        if scaler_type == 'standard':
            scaler = StandardScaler()
        elif scaler_type == 'minmax':
            scaler = MinMaxScaler()
        else:
            raise ValueError("scaler_type must be 'standard' or 'minmax'")
        
        scaler_key = f"{scaler_type}_scaler"
        
        if fit_scaler:
            # Fit scaler on the data
            scaled_values = scaler.fit_transform(df[feature_cols])
            self.scalers[scaler_key] = scaler
        else:
            # Use existing scaler
            if scaler_key not in self.scalers:
                raise ValueError(f"Scaler {scaler_key} not fitted yet")
            scaled_values = self.scalers[scaler_key].transform(df[feature_cols])
        
        # Replace scaled values
        df_scaled[feature_cols] = scaled_values
        
        return df_scaled
    
    def create_feature_summary(self, df: pd.DataFrame) -> Dict:
        """Create feature summary for metadata."""
        
        feature_cols = self.get_feature_importance_names(df)
        
        summary = {
            'total_features': len(feature_cols),
            'feature_categories': {
                'technical': len([col for col in feature_cols if any(x in col for x in ['ma_', 'rsi', 'macd', 'bb_'])]),
                'seasonal': len([col for col in feature_cols if any(x in col for x in ['month', 'season', 'harvest'])]),
                'lag': len([col for col in feature_cols if 'lag' in col]),
                'volatility': len([col for col in feature_cols if 'volatility' in col or 'vol_' in col]),
                'weather': len([col for col in feature_cols if 'weather' in col]),
                'statistical': len([col for col in feature_cols if any(x in col for x in ['mean_', 'std_', 'zscore'])]),
            },
            'data_quality': {
                'total_samples': len(df),
                'missing_values': df[feature_cols].isnull().sum().sum(),
                'missing_percentage': (df[feature_cols].isnull().sum().sum() / (len(df) * len(feature_cols))) * 100,
            },
            'feature_list': feature_cols[:20],  # First 20 features for reference
        }
        
        return summary
