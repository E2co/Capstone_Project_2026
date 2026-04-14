import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model


class AutoencoderFraudModel:

    FEATURE_COLS = [
        'V1','V2','V3','V4','V5','V6','V7','V8','V9','V10',
        'V11','V12','V13','V14','V15','V16','V17','V18','V19','V20',
        'V21','V22','V23','V24','V25','V26','V27','V28',
        'Amount'
    ]

    def __init__(
        self,
        model_path: str = "models/autoencoder_refined.keras",
        scaler_path: str = "models/autoencoder_scaler.pkl",
        threshold_path: str = "models/autoencoder_threshold.pkl",
    ):
        self.model     = load_model(model_path)
        self.scaler    = joblib.load(scaler_path)
        self.threshold = joblib.load(threshold_path)

    def predict(self, transaction: dict) -> dict:
        df      = pd.DataFrame([transaction])[self.FEATURE_COLS]
        df['Amount'] = np.log1p(df['Amount'])                    # same preprocessing as training
        scaled  = self.scaler.transform(df)

        recon   = self.model.predict(scaled, verbose=0)
        error   = float(np.mean(np.abs(scaled - recon)))

        fraud_prob = float(np.clip(error / (self.threshold * 2), 0, 1))

        return {
            "reconstruction_error": error,
            "threshold":            self.threshold,
            "fraud_probability":    fraud_prob,
            "ml_score":             fraud_prob * 100,
            "signal":               "HIGH" if error >= self.threshold else "LOW",
        }
