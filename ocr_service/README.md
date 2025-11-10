# PASecure OCR Service

Simple FastAPI wrapper around Tesseract for extracting raw text from ID images.

## Local development

```bash
cd ocr_service
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8080
```

Visit <http://localhost:8080/docs> to upload an image and view the OCR output.

## Docker

```bash
cd ocr_service
docker build -t passecure-ocr .
docker run -p 8080:8080 passecure-ocr
```
