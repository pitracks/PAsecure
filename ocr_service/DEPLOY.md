# Deploying PASecure OCR Service

## Option 1: Railway (Recommended - Easiest)

### Steps:

1. **Sign up/Login to Railway**
   - Go to https://railway.app
   - Sign up with GitHub (easiest)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `pitracks/PAsecure` repository
   - Select the `ocr_service` folder as the root directory

3. **Configure the Service**
   - Railway will auto-detect it's a Python app
   - It will use the `requirements.txt` automatically
   - **Important**: Add a build command to install Tesseract:
     - Go to Settings → Build
     - Add build command:
       ```bash
       apt-get update && apt-get install -y tesseract-ocr && pip install -r requirements.txt
       ```
   - Or use the Dockerfile (Railway supports Dockerfiles)

4. **Set Port**
   - Railway will auto-assign a port
   - The app listens on port 8080 (configured in Dockerfile)
   - Railway will expose it automatically

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Copy the generated URL (e.g., `https://your-app.railway.app`)

6. **Update Supabase Secret**
   - Go to: https://supabase.com/dashboard/project/jkrotqcstjnrmhxyturv/functions/secrets
   - Add/Update `OCR_SERVICE_URL` = `https://your-app.railway.app/ocr`

---

## Option 2: Render

### Steps:

1. **Sign up/Login to Render**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select `pitracks/PAsecure`
   - Set:
     - **Root Directory**: `ocr_service`
     - **Environment**: `Python 3`
     - **Build Command**: 
       ```bash
       apt-get update && apt-get install -y tesseract-ocr && pip install -r requirements.txt
       ```
     - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
     - **Port**: Auto (Render sets `$PORT` env var)

3. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy the URL (e.g., `https://your-app.onrender.com`)

4. **Update Supabase Secret**
   - Add `OCR_SERVICE_URL` = `https://your-app.onrender.com/ocr`

---

## Option 3: Local Testing (Before Cloud Deploy)

### Windows Setup:

1. **Install Tesseract OCR**
   - Download: https://github.com/UB-Mannheim/tesseract/wiki
   - Install to default location: `C:\Program Files\Tesseract-OCR`
   - Add to PATH or set environment variable:
     ```powershell
     $env:TESSDATA_PREFIX = "C:\Program Files\Tesseract-OCR\tessdata"
     ```

2. **Run the Service**
   ```powershell
   cd C:\xampp\htdocs\CAPSTONE UI2\CAPSTONE UI2\ocr_service
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app:app --host 0.0.0.0 --port 8080
   ```

3. **Test Locally**
   - Visit: http://localhost:8080/docs
   - Upload an image to test OCR

4. **Update Supabase Secret (for local testing)**
   - Use ngrok or similar to expose localhost:
     ```powershell
     # Install ngrok: https://ngrok.com/download
     ngrok http 8080
     ```
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Set `OCR_SERVICE_URL` = `https://abc123.ngrok.io/ocr`

---

## Testing the Deployment

Once deployed, test the endpoint:

```bash
curl -X POST https://your-service-url/ocr \
  -F "file=@path/to/test-image.jpg"
```

Or use the interactive docs at: `https://your-service-url/docs`

---

## Troubleshooting

- **Tesseract not found**: Make sure Tesseract is installed in the deployment environment
- **Port issues**: Ensure the service listens on `0.0.0.0` (not `127.0.0.1`)
- **CORS errors**: Add CORS middleware to FastAPI if needed (for browser requests)

