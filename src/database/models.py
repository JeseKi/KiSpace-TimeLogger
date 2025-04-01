# database/models.py
import duckdb

DATABASE_PATH = "./timestamp.duckdb"
conn = duckdb.connect(DATABASE_PATH)

def init_db():
    conn.execute("""
        CREATE TABLE IF NOT EXISTS time_logs (
            uuid TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            activity TEXT NOT NULL,
            tag TEXT
        );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON time_logs (user_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON time_logs (timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tag ON time_logs (tag)")