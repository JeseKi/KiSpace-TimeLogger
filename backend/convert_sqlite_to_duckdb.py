import duckdb
conn = duckdb.connect("./timestamp.duckdb")
print(conn.execute("SELECT * FROM time_logs LIMIT 5").fetchall())
conn.close()