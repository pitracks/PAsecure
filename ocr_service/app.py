import io
import os
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import pytesseract

app = FastAPI(title="PASecure OCR Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your Supabase domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Tesseract path (for Windows/local dev)
if os.name == 'nt':  # Windows
    tesseract_path = os.getenv('TESSERACT_CMD', r'C:\Program Files\Tesseract-OCR\tesseract.exe')
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path


class OCRResult(BaseModel):
    text: str


@app.post("/ocr", response_model=OCRResult)
async def run_ocr(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file")

    try:
        # Read image bytes
        image_bytes = await file.read()
        
        # Open image with PIL for better processing
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary (handles RGBA, P mode, etc.)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Run OCR
        text = pytesseract.image_to_string(image, lang="eng")
        
        # Clean up whitespace
        text = text.strip()
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(exc)}") from exc

    return OCRResult(text=text)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "PASecure OCR Service"}
