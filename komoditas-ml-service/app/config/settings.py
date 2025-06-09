"""Configuration settings untuk ML service."""

import os
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    app_name: str = "Komoditas ML Service"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # API Configuration
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8001, env="API_PORT")
    api_prefix: str = Field(default="/api/v1", env="API_PREFIX")
    
    # Database Configuration
    database_url: str = Field(
        default="postgresql://postgres:postgres123@localhost:5432/komoditas_watch",
        env="DATABASE_URL"
    )
    
    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379/2", env="REDIS_URL")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # ML Configuration
    model_store_path: str = Field(default="data/models", env="MODEL_STORE_PATH")
    artifact_store_path: str = Field(default="data/artifacts", env="ARTIFACT_STORE_PATH")
    feature_store_path: str = Field(default="data/features", env="FEATURE_STORE_PATH")
    
    # Model Training
    train_test_split_ratio: float = Field(default=0.8, env="TRAIN_TEST_SPLIT_RATIO")
    validation_split_ratio: float = Field(default=0.2, env="VALIDATION_SPLIT_RATIO")
    max_training_samples: int = Field(default=10000, env="MAX_TRAINING_SAMPLES")
    
    # Prophet Model Configuration
    prophet_seasonality_mode: str = Field(default="multiplicative", env="PROPHET_SEASONALITY_MODE")
    prophet_yearly_seasonality: bool = Field(default=True, env="PROPHET_YEARLY_SEASONALITY")
    prophet_weekly_seasonality: bool = Field(default=True, env="PROPHET_WEEKLY_SEASONALITY")
    prophet_daily_seasonality: bool = Field(default=False, env="PROPHET_DAILY_SEASONALITY")
    prophet_uncertainty_samples: int = Field(default=1000, env="PROPHET_UNCERTAINTY_SAMPLES")
    
    # LSTM Model Configuration
    lstm_sequence_length: int = Field(default=30, env="LSTM_SEQUENCE_LENGTH")
    lstm_hidden_units: int = Field(default=64, env="LSTM_HIDDEN_UNITS")
    lstm_dropout_rate: float = Field(default=0.2, env="LSTM_DROPOUT_RATE")
    lstm_batch_size: int = Field(default=32, env="LSTM_BATCH_SIZE")
    lstm_epochs: int = Field(default=100, env="LSTM_EPOCHS")
    lstm_learning_rate: float = Field(default=0.001, env="LSTM_LEARNING_RATE")
    
    # Anomaly Detection Configuration
    isolation_forest_contamination: float = Field(default=0.1, env="ISOLATION_FOREST_CONTAMINATION")
    isolation_forest_n_estimators: int = Field(default=100, env="ISOLATION_FOREST_N_ESTIMATORS")
    dbscan_eps: float = Field(default=0.5, env="DBSCAN_EPS")
    dbscan_min_samples: int = Field(default=5, env="DBSCAN_MIN_SAMPLES")
    
    # Feature Engineering
    moving_average_windows: List[int] = Field(default=[7, 14, 30], env="MOVING_AVERAGE_WINDOWS")
    volatility_windows: List[int] = Field(default=[7, 30], env="VOLATILITY_WINDOWS")
    price_change_periods: List[int] = Field(default=[1, 7, 30], env="PRICE_CHANGE_PERIODS")
    
    # Performance Requirements
    max_prediction_latency_ms: int = Field(default=100, env="MAX_PREDICTION_LATENCY_MS")
    target_forecast_accuracy: float = Field(default=0.85, env="TARGET_FORECAST_ACCURACY")
    target_anomaly_precision: float = Field(default=0.90, env="TARGET_ANOMALY_PRECISION")
    
    # Monitoring and Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_port: int = Field(default=8002, env="METRICS_PORT")
    
    # MLFlow Configuration
    mlflow_tracking_uri: Optional[str] = Field(default=None, env="MLFLOW_TRACKING_URI")
    mlflow_experiment_name: str = Field(default="komoditas-ml", env="MLFLOW_EXPERIMENT_NAME")
    
    # External APIs
    backend_api_url: str = Field(
        default="http://localhost:3000/api/v1", 
        env="BACKEND_API_URL"
    )
    backend_api_key: Optional[str] = Field(default=None, env="BACKEND_API_KEY")
    
    # Security
    secret_key: str = Field(
        default="development-ml-secret-key-change-in-production",
        env="SECRET_KEY"
    )
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="CORS_ORIGINS"
    )
    
    # Indonesian Holidays (for Prophet)
    indonesian_holidays: List[str] = Field(
        default=[
            "New Year's Day",
            "Chinese New Year",
            "Nyepi",
            "Good Friday", 
            "Easter Sunday",
            "Labour Day",
            "Ascension Day",
            "Vesak Day",
            "Pancasila Day", 
            "Eid al-Fitr",
            "Eid al-Adha",
            "Independence Day",
            "Islamic New Year",
            "Maulid",
            "Christmas Day"
        ],
        env="INDONESIAN_HOLIDAYS"
    )
    
    # Commodities Configuration
    supported_commodities: List[str] = Field(
        default=[
            "BERAS", "JAGUNG", "KEDELAI", "GULA_PASIR", "MINYAK_GORENG",
            "DAGING_SAPI", "DAGING_AYAM", "TELUR_AYAM", "CABAI_MERAH",
            "BAWANG_MERAH", "BAWANG_PUTIH", "TOMAT"
        ],
        env="SUPPORTED_COMMODITIES"
    )
    
    # Indonesian Provinces
    supported_regions: List[str] = Field(
        default=[
            "11", "12", "13", "14", "15", "16", "17", "18", "19", "21",
            "31", "32", "33", "34", "35", "36",
            "51", "52", "53",
            "61", "62", "63", "64", "65",
            "71", "72", "73", "74", "75", "76",
            "81", "82",
            "91", "94", "95", "96", "97"
        ],
        env="SUPPORTED_REGIONS"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
