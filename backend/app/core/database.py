from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

# Adjust file path prefixes if SQLite url format is used
db_url = settings.DATABASE_URL
if db_url.startswith("file:"):
    db_url = db_url.replace("file:", "sqlite:///", 1)

connect_args = {}
pool_args = {}

if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
elif "postgresql" in db_url:
    # Disable connection pooling when using PgBouncer in transaction mode (port 6543)
    if "6543" in db_url or "pgbouncer" in db_url:
        pool_args["poolclass"] = NullPool
        # Strip ?pgbouncer=true which is prisma-specific and causes issues in psycopg2
        if "?" in db_url:
            base_url, query = db_url.split("?", 1)
            params = [p for p in query.split("&") if not p.startswith("pgbouncer")]
            db_url = base_url + ("?" + "&".join(params) if params else "")

engine = create_engine(db_url, connect_args=connect_args, **pool_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
