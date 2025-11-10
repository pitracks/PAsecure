import io
from fastapi import FastAPI, UploadFile, HTTPException
from pydantic import BaseModel
import pytesseract

app = FastAPI(title="PASecure OCR Service")


class OCRResult(BaseModel):
    text: str


@app.post("/ocr", response_model=OCRResult)
async def run_ocr(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file")

    try:
        image_bytes = io.BytesIO(await file.read())
        text = pytesseract.image_to_string(image_bytes, lang="eng")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR failed: {exc}") from exc

    return OCRResult(text=text)
