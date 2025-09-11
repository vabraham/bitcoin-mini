# Use a small official Python image
# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Working directory in the container
WORKDIR /app

# Install deps first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app.py index.html .

# Persist DB at /app/data and set default DB path
ENV DB_PATH=/app/data/btcmini.db
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Run the app
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]