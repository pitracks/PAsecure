# Image Organization Guide for PASecure ID Verification

## Quick Start - How to Add Images

### Step 1: Prepare Your Images
1. **Collect ID card images** (Senior Citizen and PWD IDs)
2. **Name them correctly** using these patterns:
   - `senior_genuine_001.jpg` (genuine senior citizen IDs)
   - `senior_counterfeit_001.jpg` (fake senior citizen IDs)  
   - `pwd_genuine_001.jpg` (genuine PWD IDs)
   - `pwd_counterfeit_001.jpg` (fake PWD IDs)

### Step 2: Place Images in Source Directory
Put all your images in: `ml/data/images/`

### Step 3: Run Organization Script
```powershell
cd "c:\xampp\htdocs\CAPSTONE UI2\CAPSTONE UI2"
python ml\organize_dataset.py --source_dir "ml\data\images" --split 0.8
```

This will automatically:
- Split images 80% training / 20% validation
- Organize into proper class folders
- Create the correct directory structure

## Directory Structure

```
ml/data/
├── images/                    # ← PUT YOUR IMAGES HERE
│   ├── senior_genuine_001.jpg
│   ├── senior_genuine_002.jpg
│   ├── senior_counterfeit_001.jpg
│   ├── pwd_genuine_001.jpg
│   └── pwd_counterfeit_001.jpg
├── train/                     # ← Auto-generated (80% of images)
│   ├── senior_genuine/
│   ├── senior_counterfeit/
│   ├── pwd_genuine/
│   └── pwd_counterfeit/
└── val/                       # ← Auto-generated (20% of images)
    ├── senior_genuine/
    ├── senior_counterfeit/
    ├── pwd_genuine/
    └── pwd_counterfeit/
```

## Image Requirements

### Minimum Dataset Size
- **Per class**: 50-100 images minimum (more is better)
- **Total**: 200-400 images minimum
- **Format**: JPG, PNG, BMP, or TIFF
- **Size**: Any size (will be resized to 224x224 during training)

### Image Quality Tips

#### For Genuine IDs:
- Take clear, well-lit photos
- Include various angles and lighting conditions
- Different wear patterns (new vs. old cards)
- Various card designs if available
- Good contrast and sharp text

#### For Counterfeit IDs:
- Create or collect fake IDs that look similar to genuine ones
- Include obvious fakes and subtle fakes
- Different printing quality levels
- Various materials (paper, plastic, etc.)
- Blurry or low-quality reproductions

## Manual Organization (Alternative)

If you prefer to organize manually:

1. **Create folders**:
   ```
   ml/data/train/senior_genuine/
   ml/data/train/senior_counterfeit/
   ml/data/train/pwd_genuine/
   ml/data/train/pwd_counterfeit/
   ml/data/val/senior_genuine/
   ml/data/val/senior_counterfeit/
   ml/data/val/pwd_genuine/
   ml/data/val/pwd_counterfeit/
   ```

2. **Place images** in appropriate folders
3. **Use 80% for training, 20% for validation**
4. **Ensure balanced classes** (similar number of images per class)

## Training Your Model

After organizing images:

1. **Train the model**:
   ```powershell
   python ml\train.py --img 224 --batch 32 --epochs 10 --finetune_epochs 5
   ```

2. **Convert to web format**:
   ```powershell
   npm install -g @tensorflow/tfjs-converter@4.15.0
   tensorflowjs_converter --input_format=tf_saved_model --signature_name=serving_default --saved_model_tags=serve saved_model web_model
   ```

## Troubleshooting

**"Could not find directory data\train"**
- Run the organize script first to create the folder structure

**"No images found for [class]"**
- Check your image filenames match the expected patterns
- Ensure images are in supported formats (JPG, PNG, etc.)

**Low accuracy during training**
- Add more training data
- Ensure balanced classes
- Check image quality and variety

## Current Status

✅ Your dataset is currently organized with 8 images total (2 per class)
✅ Ready for training
✅ Web model conversion available

**Next Steps:**
1. Add more images to `ml/data/images/` (aim for 50+ per class)
2. Run the organization script again
3. Train the model with more data
4. Convert to web format for deployment
