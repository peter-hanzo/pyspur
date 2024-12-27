# Base stage
FROM python:3.12 as base
WORKDIR /pyspur
RUN apt-get update && apt-get install figlet
RUN figlet "Building PySpur Backend Docker Image"
COPY requirements.txt .
RUN pip install -r requirements.txt

# Development stage
FROM base as development
# Development-specific instructions here
RUN figlet "PySpur Backend Development Stage"

# Production stage
FROM base as production
COPY . .
# Production-specific instructions here
