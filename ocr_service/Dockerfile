FROM python:3.11-slim

# Install Tesseract OCR
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install dependencies
# Railway builds from project root, so reference ocr_service/ path
COPY ocr_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
# Railway builds from project root, so reference ocr_service/ path
COPY ocr_service/app.py .

# Use PORT environment variable (defaults to 8080)
ENV PORT=8080
EXPOSE $PORT

# Start the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}
