from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Adjust file path prefixes if SQLite url format is used
db_url = settings.DATABASE_URL
if db_url.startswith("file:"):
    db_url = db_url.replace("file:", "sqlite:///", 1)

# Clean up Prisma-specific query parameters (like pgbouncer) that psycopg2 doesn't support
if "postgresql" in db_url and "?" in db_url:
    db_url = db_url.split("?")[0]

connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
