# Model Retraining Guide

## Problem
The current model is misclassifying IDs because:
1. **Insufficient training data** - Only 2-5 images per class (needs 50-100+ per class)
2. **Preprocessing mismatch** - Fixed in code, but model needs retraining

## Quick Check Dataset Size

Run this to see your current dataset:
```powershell
cd "C:\xampp\htdocs\CAPSTONE UI2\CAPSTONE UI2"
python ml\check_dataset.py
```

## Step 1: Collect More Training Images

**Minimum Requirements:**
- **Per class**: 50-100 images minimum
- **Total**: 200-400 images minimum
- **Format**: JPG, PNG (any size, will be resized)

**Recommended:**
- **Per class**: 100+ images
- **Total**: 400+ images
- Include variety: different lighting, angles, wear patterns

## Step 2: Organize Your Images

Name your images with these patterns:
- `senior_genuine_001.jpg`, `senior_genuine_002.jpg`, etc.
- `senior_counterfeit_001.jpg`, etc.
- `pwd_genuine_001.jpg`, etc.
- `pwd_counterfeit_001.jpg`, etc.

Then run:
```powershell
python ml\organize_dataset.py --source_dir "ml\data\images" --split 0.8
```

This will:
- Split 80% to `train/` and 20% to `val/`
- Organize into proper class folders

## Step 3: Activate Virtual Environment

```powershell
cd "C:\xampp\htdocs\CAPSTONE UI2\CAPSTONE UI2"
.venv\Scripts\activate
```

## Step 4: Train the Model

```powershell
python ml\train.py --img 224 --batch 32 --epochs 20 --finetune_epochs 10
```

**Parameters:**
- `--img 224`: Image size (224x224 pixels)
- `--batch 32`: Batch size (reduce to 16 if you get memory errors)
- `--epochs 20`: Initial training epochs (increase if you have more data)
- `--finetune_epochs 10`: Fine-tuning epochs

**What to expect:**
- Training will take 10-30 minutes depending on your GPU/CPU
- Watch for validation accuracy - should reach 80%+ with enough data
- Model will be saved to `saved_model/`
- TF.js model will be exported to `web_model/`

## Step 5: Convert to TensorFlow.js (if needed)

If the automatic conversion fails, run manually:
```powershell
pip install tensorflowjs
tensorflowjs_converter --input_format=tf_saved_model --signature_name=serving_default --saved_model_tags=serve saved_model web_model
```

## Step 6: Test the New Model

1. Refresh your browser (hard refresh: `Ctrl+Shift+R`)
2. Upload a test ID image
3. Check console for prediction scores
4. Should see correct classification with high confidence (>80%)

## Troubleshooting

### Low Accuracy After Training
- **Not enough data**: Collect more images
- **Unbalanced classes**: Ensure similar number of images per class
- **Poor image quality**: Use clear, well-lit photos
- **Increase epochs**: Try `--epochs 30 --finetune_epochs 15`

### Memory Errors
- Reduce batch size: `--batch 16` or `--batch 8`
- Close other applications

### Model Not Loading in Browser
- Check `web_model/model.json` exists
- Check browser console for errors
- Verify TensorFlow.js is loading correctly

## Current Status

✅ **Fixed Issues:**
- Preprocessing now matches training (normalizes to [-1, 1])
- Removed augmentation from inference model
- Added data augmentation to training pipeline only

❌ **Still Needs:**
- More training images (currently only 2-5 per class)
- Model retraining with new data

