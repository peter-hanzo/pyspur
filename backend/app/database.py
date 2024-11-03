import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Get the database URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

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
