import io
import os
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

app = FastAPI(title="PASecure OCR Service", docs_url="/docs", redoc_url="/redoc")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your Supabase domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route - redirect to health or return service info
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "PASecure OCR Service",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "ocr": "/ocr",
            "docs": "/docs"
        }
    }

# Configure Tesseract path (for Windows/local dev)
if os.name == 'nt':  # Windows
    tesseract_path = os.getenv('TESSERACT_CMD', r'C:\Program Files\Tesseract-OCR\tesseract.exe')
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path


class OCRResult(BaseModel):
    text: str


def preprocess_image(image: Image.Image) -> Image.Image:
    """Apply image preprocessing to improve OCR accuracy"""
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to grayscale for better contrast
    image = image.convert('L')
    
    # Resize if too small (Tesseract works better with larger images)
    # Do this early to improve subsequent processing
    width, height = image.size
    if width < 1200 or height < 900:
        scale = max(1200 / width, 900 / height)
        new_width = int(width * scale)
        new_height = int(height * scale)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Apply aggressive contrast enhancement
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(3.0)  # Increase contrast by 3x
    
    # Enhance brightness to make text more visible
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(1.2)  # Slightly brighter
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(3.0)  # Increase sharpness by 3x
    
    # Apply denoising (median filter)
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Apply unsharp mask for better edge definition
    image = image.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    
    return image

@app.post("/ocr", response_model=OCRResult)
async def run_ocr(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file")

    try:
        # Read image bytes
        image_bytes = await file.read()
        
        # Open image with PIL
        image = Image.open(io.BytesIO(image_bytes))
        
        # Preprocess image for better OCR
        processed_image = preprocess_image(image)
        
        # Try multiple OCR configurations for better results
        texts = []
        
        # Configuration 1: Default with PSM 6 (uniform block of text)
        try:
            text1 = pytesseract.image_to_string(
                processed_image, 
                lang="eng",
                config='--psm 6 --oem 3'
            )
            if text1.strip():
                texts.append(text1)
        except:
            pass
        
        # Configuration 2: PSM 11 (sparse text - single text line)
        try:
            text2 = pytesseract.image_to_string(
                processed_image,
                lang="eng",
                config='--psm 11 --oem 3'
            )
            if text2.strip() and text2 not in texts:
                texts.append(text2)
        except:
            pass
        
        # Configuration 3: PSM 3 (fully automatic page segmentation)
        try:
            text3 = pytesseract.image_to_string(
                processed_image,
                lang="eng",
                config='--psm 3 --oem 3'
            )
            if text3.strip() and text3 not in texts:
                texts.append(text3)
        except:
            pass
        
        # Combine all results, prioritizing longer/more complete text
        if texts:
            # Use the text with most content
            text = max(texts, key=len)
        else:
            # Fallback to basic OCR
            text = pytesseract.image_to_string(processed_image, lang="eng")
        
        # Clean up whitespace
        text = text.strip()
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(exc)}") from exc

    return OCRResult(text=text)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "PASecure OCR Service"}
