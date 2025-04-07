# database/db.py
import duckdb
from contextlib import asynccontextmanager

DATABASE_PATH = "./timestamp.duckdb"

@asynccontextmanager
async def get_db():
    conn = duckdb.connect(DATABASE_PATH)
    try:
        yield conn
    finally:
        conn.close()

async def init_db():
    async with get_db() as conn:
        from .models import init_db as init_table
        init_table()