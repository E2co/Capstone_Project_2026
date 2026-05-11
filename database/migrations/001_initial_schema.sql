-- ═══════════════════════════════════════════════════════════════════════════
-- RiskNet — Migration 001: Initial Schema + v2.5 Additions
-- Location: backend/database/migrations/001_initial_schema.sql
--
-- HOW TO RUN:
--   mysql -u root -p risknet_db < backend/database/migrations/001_initial_schema.sql
--
-- Safe to re-run (IF NOT EXISTS / INSERT IGNORE).
-- ═══════════════════════════════════════════════════════════════════════════

USE risknet_db;

-- ── 1. settings ───────────────────────────────────────────────────────────────
-- Stores engine weights + review thresholds.
-- Updated defaults now match documentation: Rule=20, ML=50, Anomaly=30
CREATE TABLE IF NOT EXISTS settings (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    rule_weight           FLOAT   DEFAULT 20,
    ml_core               FLOAT   DEFAULT 50,
    anomaly_weight        FLOAT   DEFAULT 30,
    review_threshold      FLOAT   DEFAULT 80,
    auto_approve_low_risk BOOLEAN DEFAULT TRUE,
    auto_flag_high_risk   BOOLEAN DEFAULT FALSE,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default row (correct weights per documentation)
INSERT IGNORE INTO settings
    (id, rule_weight, ml_core, anomaly_weight, review_threshold,
     auto_approve_low_risk, auto_flag_high_risk)
VALUES (1, 20, 50, 30, 80, TRUE, FALSE);

-- ── 2. transactions ───────────────────────────────────────────────────────────
-- Core transaction table. V1-V28 are PCA-reduced features from the dataset.
CREATE TABLE IF NOT EXISTS transactions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    amount      FLOAT NOT NULL,
    v1  FLOAT, v2  FLOAT, v3  FLOAT, v4  FLOAT, v5  FLOAT,
    v6  FLOAT, v7  FLOAT, v8  FLOAT, v9  FLOAT, v10 FLOAT,
    v11 FLOAT, v12 FLOAT, v13 FLOAT, v14 FLOAT, v15 FLOAT,
    v16 FLOAT, v17 FLOAT, v18 FLOAT, v19 FLOAT, v20 FLOAT,
    v21 FLOAT, v22 FLOAT, v23 FLOAT, v24 FLOAT, v25 FLOAT,
    v26 FLOAT, v27 FLOAT, v28 FLOAT,
    class       INT         DEFAULT 0,      -- 0=legit, 1=fraud (ground truth)
    status      VARCHAR(20) DEFAULT 'pending',
    location    VARCHAR(100),
    time_stamp  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status     (status),
    INDEX idx_class      (class),
    INDEX idx_time_stamp (time_stamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. feedback ───────────────────────────────────────────────────────────────
-- Stores every analyst decision for future model retraining.
-- flag  → label='fraud' | approve/review → label='legit'
CREATE TABLE IF NOT EXISTS feedback (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id   INT          NOT NULL,
    label            ENUM('fraud','legit') NOT NULL,
    analyst_action   VARCHAR(20)  NOT NULL,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_feedback_txn   (transaction_id),
    INDEX idx_feedback_label (label),
    INDEX idx_feedback_time  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. audit_log ─────────────────────────────────────────────────────────────
-- Every scoring event: ML score, anomaly score, rule score, final score.
-- Enables full explainability for any transaction.
CREATE TABLE IF NOT EXISTS audit_log (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id   INT,                     -- NULL = scored without a DB row
    ml_score         FLOAT,
    anomaly_score    FLOAT,
    rule_score       FLOAT,
    final_score      FLOAT,
    risk_tier        VARCHAR(10),             -- 'LOW', 'MEDIUM', 'HIGH'
    auto_flagged     BOOLEAN DEFAULT FALSE,   -- TRUE if system auto-flagged
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_txn  (transaction_id),
    INDEX idx_audit_time (created_at),
    INDEX idx_audit_tier (risk_tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Verification query (run to confirm) ──────────────────────────────────────
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'risknet_db'
  AND table_name IN ('settings','transactions','feedback','audit_log')
ORDER BY table_name;