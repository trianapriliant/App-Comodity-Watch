"""Logging configuration untuk ML service."""

import logging
import sys
from pathlib import Path
from typing import Dict, Any

import structlog
from structlog import configure, get_logger
from structlog.stdlib import LoggerFactory

from app.config.settings import settings


def setup_logging() -> None:
    """Setup structured logging dengan structlog."""
    
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )
    
    # Configure structlog
    configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if settings.environment == "production"
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        context_class=dict,
        logger_factory=LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_ml_logger(name: str = "ml-service") -> structlog.stdlib.BoundLogger:
    """Get logger instance dengan context untuk ML service."""
    return get_logger(name)


def log_model_performance(
    logger: structlog.stdlib.BoundLogger,
    model_name: str,
    metrics: Dict[str, Any],
    model_version: str = None,
    dataset_info: Dict[str, Any] = None
) -> None:
    """Log model performance metrics."""
    
    log_data = {
        "event": "model_performance",
        "model_name": model_name,
        "metrics": metrics,
    }
    
    if model_version:
        log_data["model_version"] = model_version
    
    if dataset_info:
        log_data["dataset_info"] = dataset_info
    
    logger.info("Model performance logged", **log_data)


def log_prediction_request(
    logger: structlog.stdlib.BoundLogger,
    request_id: str,
    commodity_code: str,
    region_code: str = None,
    prediction_horizon: int = None,
    latency_ms: float = None
) -> None:
    """Log prediction request details."""
    
    log_data = {
        "event": "prediction_request",
        "request_id": request_id,
        "commodity_code": commodity_code,
    }
    
    if region_code:
        log_data["region_code"] = region_code
    
    if prediction_horizon:
        log_data["prediction_horizon"] = prediction_horizon
    
    if latency_ms:
        log_data["latency_ms"] = latency_ms
    
    logger.info("Prediction request processed", **log_data)


def log_anomaly_detection(
    logger: structlog.stdlib.BoundLogger,
    anomaly_type: str,
    commodity_code: str,
    region_code: str,
    anomaly_score: float,
    threshold: float,
    details: Dict[str, Any] = None
) -> None:
    """Log anomaly detection results."""
    
    log_data = {
        "event": "anomaly_detected",
        "anomaly_type": anomaly_type,
        "commodity_code": commodity_code,
        "region_code": region_code,
        "anomaly_score": anomaly_score,
        "threshold": threshold,
    }
    
    if details:
        log_data["details"] = details
    
    logger.warning("Anomaly detected", **log_data)


def log_model_training(
    logger: structlog.stdlib.BoundLogger,
    model_name: str,
    training_duration_seconds: float,
    training_samples: int,
    validation_metrics: Dict[str, Any],
    hyperparameters: Dict[str, Any] = None
) -> None:
    """Log model training details."""
    
    log_data = {
        "event": "model_training_completed",
        "model_name": model_name,
        "training_duration_seconds": training_duration_seconds,
        "training_samples": training_samples,
        "validation_metrics": validation_metrics,
    }
    
    if hyperparameters:
        log_data["hyperparameters"] = hyperparameters
    
    logger.info("Model training completed", **log_data)


def log_data_quality_check(
    logger: structlog.stdlib.BoundLogger,
    data_source: str,
    total_records: int,
    valid_records: int,
    quality_score: float,
    issues: list[str] = None
) -> None:
    """Log data quality check results."""
    
    log_data = {
        "event": "data_quality_check",
        "data_source": data_source,
        "total_records": total_records,
        "valid_records": valid_records,
        "quality_score": quality_score,
    }
    
    if issues:
        log_data["issues"] = issues
    
    if quality_score < 0.8:
        logger.warning("Low data quality detected", **log_data)
    else:
        logger.info("Data quality check passed", **log_data)


class MLServiceLogger:
    """Centralized logger untuk ML service operations."""
    
    def __init__(self):
        self.logger = get_ml_logger("ml-service")
        
    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self.logger.info(message, **kwargs)
        
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self.logger.warning(message, **kwargs)
        
    def error(self, message: str, **kwargs) -> None:
        """Log error message."""
        self.logger.error(message, **kwargs)
        
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self.logger.debug(message, **kwargs)
    
    def log_api_request(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        duration_ms: float,
        user_id: str = None
    ) -> None:
        """Log API request details."""
        
        log_data = {
            "event": "api_request",
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "duration_ms": duration_ms,
        }
        
        if user_id:
            log_data["user_id"] = user_id
        
        if status_code >= 400:
            self.logger.error("API request failed", **log_data)
        else:
            self.logger.info("API request completed", **log_data)
    
    def log_cache_operation(
        self,
        operation: str,
        cache_key: str,
        hit: bool = None,
        duration_ms: float = None
    ) -> None:
        """Log cache operation."""
        
        log_data = {
            "event": "cache_operation",
            "operation": operation,
            "cache_key": cache_key,
        }
        
        if hit is not None:
            log_data["cache_hit"] = hit
        
        if duration_ms is not None:
            log_data["duration_ms"] = duration_ms
        
        self.logger.debug("Cache operation", **log_data)


# Global logger instance
ml_logger = MLServiceLogger()

# Initialize logging
setup_logging()
