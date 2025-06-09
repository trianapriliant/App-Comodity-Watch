"""Pydantic schemas untuk ML service API."""

from datetime import datetime
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


# Base Models
class BaseResponseModel(BaseModel):
    """Base response model."""
    success: bool
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorResponseModel(BaseResponseModel):
    """Error response model."""
    success: bool = False
    error_code: Optional[str] = None
    details: Optional[Dict] = None


# Prediction Models
class PredictionRequest(BaseModel):
    """Request model untuk prediksi harga."""
    commodity_code: str = Field(..., description="Kode komoditas (e.g., BERAS)")
    region_code: Optional[str] = Field(None, description="Kode region (optional untuk prediksi nasional)")
    horizon_days: int = Field(7, ge=1, le=90, description="Horizon prediksi dalam hari")
    model_type: str = Field("prophet", description="Jenis model (prophet, lstm, ensemble)")
    include_uncertainty: bool = Field(True, description="Include confidence intervals")
    include_features: bool = Field(False, description="Include feature contributions")
    
    @validator('commodity_code')
    def validate_commodity_code(cls, v):
        valid_codes = [
            "BERAS", "JAGUNG", "KEDELAI", "GULA_PASIR", "MINYAK_GORENG",
            "DAGING_SAPI", "DAGING_AYAM", "TELUR_AYAM", "CABAI_MERAH",
            "BAWANG_MERAH", "BAWANG_PUTIH", "TOMAT"
        ]
        if v not in valid_codes:
            raise ValueError(f"Invalid commodity code. Must be one of {valid_codes}")
        return v
    
    @validator('model_type')
    def validate_model_type(cls, v):
        valid_types = ["prophet", "lstm", "ensemble"]
        if v not in valid_types:
            raise ValueError(f"Invalid model type. Must be one of {valid_types}")
        return v


class BatchPredictionRequest(BaseModel):
    """Request model untuk batch prediksi."""
    requests: List[PredictionRequest] = Field(..., description="List of prediction requests")
    
    @validator('requests')
    def validate_requests_length(cls, v):
        if len(v) > 50:  # Limit batch size
            raise ValueError("Maximum 50 predictions per batch request")
        return v


class PredictionPoint(BaseModel):
    """Single prediction point."""
    date: datetime
    predicted_price: float = Field(..., description="Harga prediksi dalam IDR")
    lower_bound: Optional[float] = Field(None, description="Lower confidence bound")
    upper_bound: Optional[float] = Field(None, description="Upper confidence bound")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")


class PredictionResponse(BaseResponseModel):
    """Response model untuk prediksi."""
    commodity_code: str
    commodity_name: str
    region_code: Optional[str] = None
    region_name: Optional[str] = None
    model_type: str
    model_version: str
    predictions: List[PredictionPoint]
    current_price: float
    price_change_forecast: float = Field(..., description="Persentase perubahan harga")
    trend_direction: str = Field(..., description="up, down, stable")
    features_used: Optional[List[str]] = None
    feature_importance: Optional[Dict[str, float]] = None
    metadata: Optional[Dict] = None


class BatchPredictionResponse(BaseResponseModel):
    """Response model untuk batch prediksi."""
    total_requests: int
    successful_predictions: int
    failed_predictions: int
    predictions: List[Union[PredictionResponse, ErrorResponseModel]]
    processing_time_ms: float


# Anomaly Detection Models
class AnomalyDetectionRequest(BaseModel):
    """Request model untuk anomaly detection."""
    commodity_code: Optional[str] = Field(None, description="Kode komoditas (optional untuk semua)")
    region_code: Optional[str] = Field(None, description="Kode region (optional untuk semua)")
    detection_type: str = Field("both", description="temporal, geographic, atau both")
    sensitivity: float = Field(0.1, ge=0.01, le=0.5, description="Sensitivity threshold")
    time_window_days: int = Field(30, ge=7, le=365, description="Time window untuk analisis")
    
    @validator('detection_type')
    def validate_detection_type(cls, v):
        valid_types = ["temporal", "geographic", "both"]
        if v not in valid_types:
            raise ValueError(f"Invalid detection type. Must be one of {valid_types}")
        return v


class AnomalyPoint(BaseModel):
    """Single anomaly point."""
    date: datetime
    commodity_code: str
    region_code: str
    actual_price: float
    expected_price: float
    anomaly_score: float = Field(..., ge=0, le=1)
    anomaly_type: str = Field(..., description="price_spike, price_drop, geographic_outlier")
    severity: str = Field(..., description="low, medium, high, critical")
    explanation: str


class AnomalyDetectionResponse(BaseResponseModel):
    """Response model untuk anomaly detection."""
    detection_type: str
    total_anomalies: int
    anomalies: List[AnomalyPoint]
    summary_statistics: Dict[str, Union[int, float]]
    detection_metadata: Dict


# Model Management Models
class ModelInfo(BaseModel):
    """Model information."""
    model_name: str
    model_type: str
    version: str
    commodity_codes: List[str]
    training_date: datetime
    accuracy_metrics: Dict[str, float]
    status: str = Field(..., description="active, deprecated, training")


class ModelPerformanceRequest(BaseModel):
    """Request untuk model performance metrics."""
    model_name: Optional[str] = None
    commodity_code: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metric_types: List[str] = Field(
        default=["mae", "rmse", "mape", "accuracy"],
        description="Types of metrics to return"
    )


class ModelPerformanceMetrics(BaseModel):
    """Model performance metrics."""
    model_name: str
    commodity_code: str
    evaluation_period: Dict[str, datetime]
    metrics: Dict[str, float]
    predictions_count: int
    accuracy_trend: List[Dict[str, Union[datetime, float]]]


class ModelPerformanceResponse(BaseResponseModel):
    """Response untuk model performance."""
    models_evaluated: int
    performance_metrics: List[ModelPerformanceMetrics]
    overall_statistics: Dict[str, float]


class RetrainingRequest(BaseModel):
    """Request untuk model retraining."""
    model_name: str
    commodity_codes: Optional[List[str]] = None
    force_retrain: bool = Field(False, description="Force retrain even if recent")
    hyperparameters: Optional[Dict] = None
    training_config: Optional[Dict] = None


class RetrainingResponse(BaseResponseModel):
    """Response untuk model retraining."""
    training_id: str
    model_name: str
    status: str = Field(..., description="started, queued, failed")
    estimated_duration_minutes: Optional[int] = None
    training_config: Dict


# Analytics Models
class CorrelationAnalysisRequest(BaseModel):
    """Request untuk weather-price correlation analysis."""
    commodity_code: str
    region_codes: Optional[List[str]] = None
    weather_types: List[str] = Field(
        default=["TEMPERATURE", "RAINFALL", "HUMIDITY"],
        description="Types of weather data to correlate"
    )
    time_window_days: int = Field(365, ge=30, le=1095, description="Analysis time window")
    correlation_method: str = Field("pearson", description="pearson, spearman, kendall")
    
    @validator('correlation_method')
    def validate_correlation_method(cls, v):
        valid_methods = ["pearson", "spearman", "kendall"]
        if v not in valid_methods:
            raise ValueError(f"Invalid correlation method. Must be one of {valid_methods}")
        return v


class CorrelationResult(BaseModel):
    """Correlation analysis result."""
    commodity_code: str
    region_code: str
    weather_type: str
    correlation_coefficient: float = Field(..., ge=-1, le=1)
    p_value: float
    significance_level: str = Field(..., description="high, medium, low, not_significant")
    lag_days: int = Field(..., description="Optimal lag in days")
    sample_size: int


class CorrelationAnalysisResponse(BaseResponseModel):
    """Response untuk correlation analysis."""
    commodity_code: str
    analysis_period: Dict[str, datetime]
    correlations: List[CorrelationResult]
    summary_insights: List[str]
    recommendations: List[str]


# Feature Engineering Models
class FeatureEngineeringRequest(BaseModel):
    """Request untuk feature engineering."""
    commodity_code: str
    region_code: Optional[str] = None
    feature_types: List[str] = Field(
        default=["technical", "seasonal", "weather", "regional"],
        description="Types of features to engineer"
    )
    lookback_days: int = Field(90, ge=30, le=365, description="Lookback period for features")
    update_cache: bool = Field(True, description="Update feature cache")


class FeatureImportance(BaseModel):
    """Feature importance score."""
    feature_name: str
    importance_score: float = Field(..., ge=0, le=1)
    feature_type: str
    description: str


class FeatureEngineeringResponse(BaseResponseModel):
    """Response untuk feature engineering."""
    commodity_code: str
    region_code: Optional[str] = None
    features_generated: int
    feature_types: List[str]
    feature_importance: List[FeatureImportance]
    quality_metrics: Dict[str, float]
    cache_updated: bool


# Health Check Models
class HealthCheckResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="healthy, degraded, unhealthy")
    timestamp: datetime = Field(default_factory=datetime.now)
    services: Dict[str, bool] = Field(..., description="Service status")
    version: str
    uptime_seconds: float
    models_loaded: int
    cache_hit_rate: float
    average_prediction_latency_ms: float


# Configuration Models
class ModelConfig(BaseModel):
    """Model configuration."""
    model_name: str
    hyperparameters: Dict
    training_config: Dict
    feature_config: Dict
    validation_config: Dict


class SystemConfig(BaseModel):
    """System configuration."""
    max_concurrent_predictions: int
    prediction_cache_ttl_seconds: int
    model_update_interval_hours: int
    anomaly_detection_sensitivity: float
    supported_commodities: List[str]
    supported_regions: List[str]
