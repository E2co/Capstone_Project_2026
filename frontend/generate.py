import os
import pandas as pd
from datetime import datetime, timedelta

SQL_OUTPUT_FILE = 'insert_transactions.sql'
TABLE_NAME = 'transactions'
BATCH_SIZE = 1000

CSV_PATH = 'creditcard.csv'

if not os.path.exists(CSV_PATH):
    print("Downloading dataset from Kaggle...")
    import kaggle
    kaggle.api.authenticate()
    kaggle.api.dataset_download_files('mlg-ulb/creditcardfraud', path='.', unzip=True)
    print("Download complete.")
    
# ── Load and Transform ────────────────────────────────────────────────────────
df = pd.read_csv(CSV_PATH)
base_time = datetime(2013, 9, 1)

df['time_stamp'] = df['Time'].apply(lambda x: base_time + timedelta(seconds=x))

v_cols = [f'V{i}' for i in range(1, 29)]
final_cols = ['time_stamp', 'Amount'] + v_cols + ['Class']
df = df[final_cols]

# ── Write to File ─────────────────────────────────────────────────────────────
with open(SQL_OUTPUT_FILE, 'w') as f:
    f.write("USE risknet_db;\nSET autocommit=0;\nSET unique_checks=0;\nSET foreign_key_checks=0;\n\n")

    col_str = "(time_stamp, amount, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16, v17, v18, v19, v20, v21, v22, v23, v24, v25, v26, v27, v28, class)"

    rows_buffer = []
    for _, row in df.iterrows():
        vals = []
        for i, val in enumerate(row):
            if i == 0:
                vals.append(f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'")
            else:
                vals.append(str(val))
        rows_buffer.append(f"({', '.join(vals)})")

        if len(rows_buffer) >= BATCH_SIZE:
            f.write(f"INSERT INTO {TABLE_NAME} {col_str} VALUES\n" + ",\n".join(rows_buffer) + ";\n")
            rows_buffer = []

    if rows_buffer:
        f.write(f"INSERT INTO {TABLE_NAME} {col_str} VALUES\n" + ",\n".join(rows_buffer) + ";\n")

    f.write("\nCOMMIT;\nSET unique_checks=1;\nSET foreign_key_checks=1;")

print("SQL file generated successfully.")