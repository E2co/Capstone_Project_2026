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
        try:
            self.model     = load_model(model_path)
            self.scaler    = joblib.load(scaler_path)
            self.threshold = joblib.load(threshold_path)
        except FileNotFoundError as e:
            raise FileNotFoundError(f"Model artifact not found: {e}") from e

    def _validate(self, transaction: dict) -> None:
        missing = [col for col in self.FEATURE_COLS if col not in transaction]
        if missing:
            raise ValueError(f"Missing required features: {missing}")
        if transaction.get("Amount", 0) < 0:
            raise ValueError(f"Amount cannot be negative, got {transaction['Amount']}")

    def predict(self, transaction: dict) -> dict:
        self._validate(transaction)

        df = pd.DataFrame([transaction])[self.FEATURE_COLS]
        df["Amount"] = np.log1p(df["Amount"])
        scaled = self.scaler.transform(df)

        recon = self.model(scaled, training=False).numpy()
        error = float(np.mean(np.abs(scaled - recon)))

        # Sigmoid-based probability: 0.5 at threshold, smooth curve around it
        fraud_prob = float(1 / (1 + np.exp(-10 * (error / self.threshold - 1))))

        return {
            "reconstruction_error": round(error, 6),
            "threshold":            self.threshold,
            "fraud_probability":    round(fraud_prob, 4),
            "ml_score":             round(fraud_prob * 100, 2),
            "signal":               "HIGH" if error >= self.threshold else "LOW",
        }
