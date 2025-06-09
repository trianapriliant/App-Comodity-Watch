"""LSTM model untuk advanced time series forecasting."""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pickle
import warnings

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
    from sklearn.preprocessing import MinMaxScaler, StandardScaler
    from sklearn.metrics import mean_absolute_error, mean_squared_error
except ImportError:
    print("TensorFlow not installed. Please install with: pip install tensorflow")
    tf = None
    keras = None

from app.config.logging import ml_logger
from app.config.settings import settings

warnings.filterwarnings('ignore')


class LSTMForecaster:
    """LSTM-based price forecasting model."""
    
    def __init__(
        self,
        commodity_code: str,
        region_code: str = None,
        sequence_length: int = None,
        hidden_units: int = None,
        dropout_rate: float = None,
        learning_rate: float = None
    ):
        self.commodity_code = commodity_code
        self.region_code = region_code
        self.model = None
        self.scaler_X = StandardScaler()
        self.scaler_y = MinMaxScaler()
        self.is_fitted = False
        self.feature_columns = []
        self.model_metadata = {}
        
        # LSTM parameters
        self.sequence_length = sequence_length or settings.lstm_sequence_length
        self.hidden_units = hidden_units or settings.lstm_hidden_units
        self.dropout_rate = dropout_rate or settings.lstm_dropout_rate
        self.learning_rate = learning_rate or settings.lstm_learning_rate
        self.batch_size = settings.lstm_batch_size
        self.epochs = settings.lstm_epochs
        
        # Training history
        self.training_history = None
        
        if tf is not None:
            # Set random seeds for reproducibility
            tf.random.set_seed(42)
            np.random.seed(42)
    
    def _build_model(self, input_shape: Tuple[int, int]) -> keras.Model:
        """Build LSTM model architecture."""
        
        model = keras.Sequential([
            # First LSTM layer
            layers.LSTM(
                self.hidden_units,
                return_sequences=True,
                input_shape=input_shape,
                dropout=self.dropout_rate,
                recurrent_dropout=self.dropout_rate
            ),
            layers.BatchNormalization(),
            
            # Second LSTM layer
            layers.LSTM(
                self.hidden_units // 2,
                return_sequences=True,
                dropout=self.dropout_rate,
                recurrent_dropout=self.dropout_rate
            ),
            layers.BatchNormalization(),
            
            # Third LSTM layer
            layers.LSTM(
                self.hidden_units // 4,
                return_sequences=False,
                dropout=self.dropout_rate,
                recurrent_dropout=self.dropout_rate
            ),
            layers.BatchNormalization(),
            
            # Dense layers
            layers.Dense(self.hidden_units // 2, activation='relu'),
            layers.Dropout(self.dropout_rate),
            layers.Dense(self.hidden_units // 4, activation='relu'),
            layers.Dropout(self.dropout_rate / 2),
            
            # Output layer
            layers.Dense(1, activation='linear')
        ])
        
        # Compile model
        optimizer = keras.optimizers.Adam(learning_rate=self.learning_rate)
        model.compile(
            optimizer=optimizer,
            loss='huber',  # Robust to outliers
            metrics=['mae', 'mse']
        )
        
        return model
    
    def prepare_data(
        self,
        df: pd.DataFrame,
        target_col: str = 'price',
        feature_cols: List[str] = None
    ) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Prepare data for LSTM training."""
        
        # Copy to avoid modifying original
        df = df.copy()
        
        # Sort by date
        if 'date' in df.columns:
            df = df.sort_values('date')
        
        # Select features
        if feature_cols is None:
            # Auto-select numerical features
            exclude_cols = [
                target_col, 'date', 'commodity_code', 'region_code',
                'commodity_name', 'region_name', 'source', 'id'
            ]
            feature_cols = [
                col for col in df.select_dtypes(include=[np.number]).columns
                if col not in exclude_cols
            ]
        
        # Ensure target column exists
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found")
        
        # Handle missing values
        for col in feature_cols:
            if col in df.columns:
                df[col] = df[col].fillna(df[col].median())
        
        df[target_col] = df[target_col].fillna(method='ffill').fillna(method='bfill')
        
        # Extract features and target
        X = df[feature_cols].values
        y = df[target_col].values.reshape(-1, 1)
        
        # Store feature columns
        self.feature_columns = feature_cols
        
        return X, y, feature_cols
    
    def create_sequences(
        self,
        X: np.ndarray,
        y: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM training."""
        
        X_sequences = []
        y_sequences = []
        
        for i in range(self.sequence_length, len(X)):
            X_sequences.append(X[i-self.sequence_length:i])
            y_sequences.append(y[i])
        
        return np.array(X_sequences), np.array(y_sequences)
    
    def fit(
        self,
        df: pd.DataFrame,
        target_col: str = 'price',
        feature_cols: List[str] = None,
        validation_split: float = 0.2,
        verbose: int = 0
    ) -> Dict:
        """Train LSTM model."""
        
        if tf is None:
            raise ImportError("TensorFlow is required for LSTM model")
        
        try:
            # Prepare data
            X, y, feature_cols = self.prepare_data(df, target_col, feature_cols)
            
            # Validate data size
            if len(X) < self.sequence_length + 10:
                raise ValueError(f"Need at least {self.sequence_length + 10} data points for training")
            
            # Scale features and target
            X_scaled = self.scaler_X.fit_transform(X)
            y_scaled = self.scaler_y.fit_transform(y)
            
            # Create sequences
            X_seq, y_seq = self.create_sequences(X_scaled, y_scaled)
            
            # Build model
            input_shape = (self.sequence_length, X_seq.shape[2])
            self.model = self._build_model(input_shape)
            
            # Callbacks
            callbacks = [
                EarlyStopping(
                    monitor='val_loss',
                    patience=20,
                    restore_best_weights=True,
                    verbose=verbose
                ),
                ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=10,
                    min_lr=1e-7,
                    verbose=verbose
                )
            ]
            
            ml_logger.info(
                "Starting LSTM model training",
                commodity_code=self.commodity_code,
                samples=len(X_seq),
                features=len(feature_cols),
                sequence_length=self.sequence_length
            )
            
            # Train model
            self.training_history = self.model.fit(
                X_seq, y_seq,
                batch_size=self.batch_size,
                epochs=self.epochs,
                validation_split=validation_split,
                callbacks=callbacks,
                verbose=verbose,
                shuffle=False  # Important for time series
            )
            
            self.is_fitted = True
            
            # Calculate training metrics
            training_metrics = self._calculate_training_metrics(X_seq, y_seq)
            
            # Store metadata
            self.model_metadata = {
                'commodity_code': self.commodity_code,
                'region_code': self.region_code,
                'training_date': datetime.now().isoformat(),
                'training_samples': len(X_seq),
                'feature_columns': self.feature_columns,
                'model_parameters': {
                    'sequence_length': self.sequence_length,
                    'hidden_units': self.hidden_units,
                    'dropout_rate': self.dropout_rate,
                    'learning_rate': self.learning_rate,
                    'batch_size': self.batch_size,
                    'epochs': self.epochs
                },
                'training_metrics': training_metrics,
                'model_summary': self._get_model_summary()
            }
            
            ml_logger.info(
                "LSTM model training completed",
                commodity_code=self.commodity_code,
                training_metrics=training_metrics
            )
            
            return training_metrics
            
        except Exception as e:
            ml_logger.error(
                "LSTM model training failed",
                commodity_code=self.commodity_code,
                error=str(e)
            )
            raise e
    
    def _calculate_training_metrics(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Calculate training metrics."""
        
        try:
            # Make predictions on training data
            y_pred_scaled = self.model.predict(X, verbose=0)
            
            # Inverse transform predictions and targets
            y_true = self.scaler_y.inverse_transform(y)
            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)
            
            # Calculate metrics
            mae = mean_absolute_error(y_true, y_pred)
            rmse = np.sqrt(mean_squared_error(y_true, y_pred))
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
                'std_price': float(np.std(y_true)),
                'final_loss': float(self.training_history.history['loss'][-1]),
                'final_val_loss': float(self.training_history.history.get('val_loss', [0])[-1])
            }
            
            return metrics
            
        except Exception as e:
            ml_logger.warning("Failed to calculate training metrics", error=str(e))
            return {}
    
    def _get_model_summary(self) -> Dict:
        """Get model architecture summary."""
        
        try:
            total_params = self.model.count_params()
            trainable_params = sum([
                np.prod(v.get_shape()) for v in self.model.trainable_variables
            ])
            
            return {
                'total_parameters': int(total_params),
                'trainable_parameters': int(trainable_params),
                'layers': len(self.model.layers),
                'optimizer': self.model.optimizer.get_config()['name'],
                'loss_function': self.model.loss
            }
        except:
            return {}
    
    def predict(
        self,
        df: pd.DataFrame,
        horizon_days: int = 7,
        target_col: str = 'price'
    ) -> pd.DataFrame:
        """Make predictions with LSTM model."""
        
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        try:
            # Prepare data
            X, y, _ = self.prepare_data(df, target_col, self.feature_columns)
            
            # Scale features
            X_scaled = self.scaler_X.transform(X)
            
            # Get last sequence for prediction
            last_sequence = X_scaled[-self.sequence_length:].reshape(1, self.sequence_length, -1)
            
            predictions = []\n            last_features = X_scaled[-1].copy()\n            \n            # Generate multi-step predictions\n            for step in range(horizon_days):\n                # Predict next value\n                pred_scaled = self.model.predict(last_sequence, verbose=0)\n                pred_price = self.scaler_y.inverse_transform(pred_scaled)[0, 0]\n                \n                predictions.append(pred_price)\n                \n                # Update features for next prediction\n                # This is a simplified approach - in practice, you'd want to\n                # properly forecast the features as well\n                new_features = self._update_features_for_next_step(\n                    last_features, pred_scaled[0, 0], step\n                )\n                \n                # Update sequence\n                new_sequence = np.concatenate([\n                    last_sequence[0, 1:, :],\n                    new_features.reshape(1, -1)\n                ]).reshape(1, self.sequence_length, -1)\n                \n                last_sequence = new_sequence\n                last_features = new_features\n            \n            # Create prediction dataframe\n            start_date = df['date'].max() + timedelta(days=1)\n            pred_dates = [start_date + timedelta(days=i) for i in range(horizon_days)]\n            \n            forecast_df = pd.DataFrame({\n                'ds': pred_dates,\n                'yhat': predictions,\n                'commodity_code': self.commodity_code,\n                'region_code': self.region_code,\n                'model_type': 'lstm'\n            })\n            \n            # Add confidence intervals (simplified)\n            forecast_df['yhat_lower'] = forecast_df['yhat'] * 0.95\n            forecast_df['yhat_upper'] = forecast_df['yhat'] * 1.05\n            \n            # Calculate confidence scores\n            forecast_df['confidence'] = self._calculate_prediction_confidence(forecast_df)\n            \n            return forecast_df\n            \n        except Exception as e:\n            ml_logger.error(\n                "LSTM prediction failed",\n                commodity_code=self.commodity_code,\n                error=str(e)\n            )\n            raise e\n    \n    def _update_features_for_next_step(\n        self,\n        last_features: np.ndarray,\n        predicted_price_scaled: float,\n        step: int\n    ) -> np.ndarray:\n        """Update features for next prediction step."""\n        \n        # This is a simplified feature update\n        # In practice, you'd want more sophisticated feature forecasting\n        \n        new_features = last_features.copy()\n        \n        # Update price-related features if they exist\n        for i, col in enumerate(self.feature_columns):\n            if 'price' in col.lower():\n                if 'lag' in col:\n                    # Shift lag features\n                    continue\n                elif 'change' in col:\n                    # Price change features\n                    new_features[i] = predicted_price_scaled - last_features[i]\n                elif 'ma_' in col:\n                    # Moving average features (simplified)\n                    new_features[i] = (last_features[i] * 0.9 + predicted_price_scaled * 0.1)\n            \n            # For other features, use simple persistence or decay\n            elif 'volatility' in col.lower():\n                new_features[i] *= 0.95  # Decay volatility\n            elif 'seasonal' in col.lower() or 'month' in col.lower():\n                # Seasonal features remain relatively stable\n                pass\n        \n        return new_features\n    \n    def _calculate_prediction_confidence(self, forecast_df: pd.DataFrame) -> pd.Series:\n        """Calculate confidence scores for predictions."""\n        \n        # Confidence decreases with prediction horizon\n        base_confidence = 0.9\n        decay_rate = 0.05\n        \n        confidence_scores = []\n        for i in range(len(forecast_df)):\n            confidence = base_confidence * np.exp(-decay_rate * i)\n            confidence_scores.append(max(confidence, 0.3))  # Minimum confidence\n        \n        return pd.Series(confidence_scores)\n    \n    def evaluate_model(\n        self,\n        test_df: pd.DataFrame,\n        target_col: str = 'price'\n    ) -> Dict:\n        """Evaluate model on test data."""\n        \n        if not self.is_fitted:\n            raise ValueError("Model must be fitted before evaluation")\n        \n        try:\n            # Prepare test data\n            X_test, y_test, _ = self.prepare_data(test_df, target_col, self.feature_columns)\n            \n            # Scale data\n            X_test_scaled = self.scaler_X.transform(X_test)\n            y_test_scaled = self.scaler_y.transform(y_test)\n            \n            # Create sequences\n            X_test_seq, y_test_seq = self.create_sequences(X_test_scaled, y_test_scaled)\n            \n            # Make predictions\n            y_pred_scaled = self.model.predict(X_test_seq, verbose=0)\n            \n            # Inverse transform\n            y_true = self.scaler_y.inverse_transform(y_test_seq)\n            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)\n            \n            # Calculate metrics\n            mae = mean_absolute_error(y_true, y_pred)\n            rmse = np.sqrt(mean_squared_error(y_true, y_pred))\n            mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100\n            \n            # R-squared\n            ss_res = np.sum((y_true - y_pred) ** 2)\n            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)\n            r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0\n            \n            evaluation_metrics = {\n                'test_mae': float(mae),\n                'test_rmse': float(rmse),\n                'test_mape': float(mape),\n                'test_r2': float(r2),\n                'test_samples': len(y_test_seq)\n            }\n            \n            ml_logger.info(\n                "LSTM model evaluation completed",\n                commodity_code=self.commodity_code,\n                **evaluation_metrics\n            )\n            \n            return evaluation_metrics\n            \n        except Exception as e:\n            ml_logger.error("Model evaluation failed", error=str(e))\n            raise e\n    \n    def save_model(self, filepath: str):\n        """Save trained model."""\n        \n        if not self.is_fitted:\n            raise ValueError("Model must be fitted before saving")\n        \n        try:\n            # Save TensorFlow model\n            model_path = filepath.replace('.pkl', '_model')\n            self.model.save(model_path)\n            \n            # Save metadata and scalers\n            model_data = {\n                'metadata': self.model_metadata,\n                'feature_columns': self.feature_columns,\n                'commodity_code': self.commodity_code,\n                'region_code': self.region_code,\n                'is_fitted': self.is_fitted,\n                'scaler_X': self.scaler_X,\n                'scaler_y': self.scaler_y,\n                'sequence_length': self.sequence_length,\n                'hidden_units': self.hidden_units,\n                'dropout_rate': self.dropout_rate,\n                'learning_rate': self.learning_rate,\n                'model_path': model_path\n            }\n            \n            with open(filepath, 'wb') as f:\n                pickle.dump(model_data, f)\n            \n            ml_logger.info(\n                "LSTM model saved",\n                commodity_code=self.commodity_code,\n                filepath=filepath\n            )\n            \n        except Exception as e:\n            ml_logger.error("Failed to save model", error=str(e))\n            raise e\n    \n    def load_model(self, filepath: str):\n        """Load trained model."""\n        \n        try:\n            # Load metadata and scalers\n            with open(filepath, 'rb') as f:\n                model_data = pickle.load(f)\n            \n            # Load TensorFlow model\n            model_path = model_data['model_path']\n            self.model = keras.models.load_model(model_path)\n            \n            # Restore attributes\n            self.metadata = model_data['metadata']\n            self.feature_columns = model_data['feature_columns']\n            self.commodity_code = model_data['commodity_code']\n            self.region_code = model_data['region_code']\n            self.is_fitted = model_data['is_fitted']\n            self.scaler_X = model_data['scaler_X']\n            self.scaler_y = model_data['scaler_y']\n            self.sequence_length = model_data['sequence_length']\n            self.hidden_units = model_data['hidden_units']\n            self.dropout_rate = model_data['dropout_rate']\n            self.learning_rate = model_data['learning_rate']\n            \n            ml_logger.info(\n                "LSTM model loaded",\n                commodity_code=self.commodity_code,\n                filepath=filepath\n            )\n            \n        except Exception as e:\n            ml_logger.error("Failed to load model", error=str(e))\n            raise e\n    \n    def get_model_info(self) -> Dict:\n        """Get model information."""\n        \n        return {\n            'model_type': 'lstm',\n            'commodity_code': self.commodity_code,\n            'region_code': self.region_code,\n            'is_fitted': self.is_fitted,\n            'feature_count': len(self.feature_columns),\n            'sequence_length': self.sequence_length,\n            'hidden_units': self.hidden_units,\n            'metadata': self.model_metadata\n        }\n