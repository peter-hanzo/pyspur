import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Get the database URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///sqlite/db.sqlite")

# Create SQLite database file if it doesn't exist and using SQLite
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    if not os.path.exists(db_path):
        open(db_path, "a").close()

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
