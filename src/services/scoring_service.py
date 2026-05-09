"""
scoring_service.py
Handles all engine scoring logic: rule engine, XGBoost, autoencoder, ensemble.
"""

from typing import Optional

# ── Score tier classification (matches documentation) ────────────────────────
# 0–39   → Legitimate
# 40–69  → Suspicious
# 70–100 → Fraudulent

def classify_score(score: float) -> dict:
    """
    Convert a 0–100 final score into a human-readable classification.
    Returns tier, label, color hint, and confidence percentage.
    """
    if score >= 70:
        return {
            "tier":       "FRAUDULENT",
            "risk":       "HIGH",
            "label":      "Fraudulent",
            "confidence": round(score, 1),
        }
    elif score >= 40:
        return {
            "tier":       "SUSPICIOUS",
            "risk":       "MEDIUM",
            "label":      "Suspicious",
            "confidence": round(score, 1),
        }
    else:
        return {
            "tier":       "LEGITIMATE",
            "risk":       "LOW",
            "label":      "Legitimate",
            "confidence": round(100 - score, 1),
        }


def normalize_weights(rule_w: float, ml_w: float, anomaly_w: float) -> tuple:
    """Normalize slider values (0–100) to weights that sum to 1.0."""
    total = rule_w + ml_w + anomaly_w
    if total == 0:
        return 1 / 3, 1 / 3, 1 / 3
    return rule_w / total, ml_w / total, anomaly_w / total


def compute_ensemble(
    rule: float, ml: float, anomaly: float,
    rule_w: float, ml_w: float, anomaly_w: float,
    review_threshold: float,
) -> dict:
    """
    Weighted ensemble of the three engine scores.
    Returns score + full classification.
    """
    final_score = (rule_w * rule) + (ml_w * ml) + (anomaly_w * anomaly)
    final_score = round(min(max(final_score, 0), 100), 2)
    classification = classify_score(final_score)
    return {
        "score":      final_score,
        "risk":       classification["risk"],
        "tier":       classification["tier"],
        "label":      classification["label"],
        "confidence": classification["confidence"],
    }


# Default weights (match documentation: Rule=0.2, ML=0.5, Anomaly=0.3)
DEFAULT_SETTINGS = {
    "rule_weight":           20,
    "ml_core":               50,
    "anomaly_weight":        30,
    "review_threshold":      80,
    "auto_approve_low_risk": True,
    "auto_flag_high_risk":   False,
}