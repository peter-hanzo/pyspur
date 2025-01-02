# Base stage
FROM python:3.12 as base
WORKDIR /pyspur/backend
COPY requirements.txt .
RUN pip install -r requirements.txt

# Development stage
FROM base as development
# Development-specific instructions here

# Production stage
FROM base as production
COPY . .
# Production-specific instructions here
