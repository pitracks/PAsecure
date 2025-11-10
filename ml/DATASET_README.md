# Dataset Setup for PASecure ID Verification

## Quick Start

1. **Prepare your images**: Collect ID card images and name them with these patterns:
   - `senior_genuine_001.jpg` (genuine senior citizen IDs)
   - `senior_counterfeit_001.jpg` (fake senior citizen IDs)
   - `pwd_genuine_001.jpg` (genuine PWD IDs)
   - `pwd_counterfeit_001.jpg` (fake PWD IDs)

2. **Organize automatically**:
   ```powershell
   python ml\organize_dataset.py --source_dir "C:\path\to\your\images" --split 0.8
   ```

3. **Train the model**:
   ```powershell
   python ml\train.py --img 224 --batch 32 --epochs 10 --finetune_epochs 5
   ```

4. **Convert to web format**:
   ```powershell
   npm install -g @tensorflow/tfjs-converter@4.15.0
   tensorflowjs_converter --input_format=tf_saved_model --signature_name=serving_default --saved_model_tags=serve saved_model web_model
   ```

## Dataset Requirements

### Minimum Images Needed
- **Per class**: 50-100 images minimum (more is better)
- **Total**: 200-400 images minimum
- **Format**: JPG, PNG, BMP, or TIFF
- **Size**: Any size (will be resized to 224x224 during training)

### Folder Structure
```
ml/data/
├── train/
│   ├── senior_genuine/     (genuine senior citizen IDs)
│   ├── senior_counterfeit/ (fake senior citizen IDs)
│   ├── pwd_genuine/        (genuine PWD IDs)
│   └── pwd_counterfeit/    (fake PWD IDs)
└── val/
    ├── senior_genuine/
    ├── senior_counterfeit/
    ├── pwd_genuine/
    └── pwd_counterfeit/
```

## Manual Organization

If you prefer to organize manually:

1. Create the folder structure above
2. Place your images in the correct folders
3. Use 80% for training, 20% for validation
4. Ensure balanced classes (similar number of images per class)

## Image Collection Tips

### For Genuine IDs:
- Take clear, well-lit photos
- Include various angles and lighting conditions
- Different wear patterns (new vs. old cards)
- Various card designs if available

### For Counterfeit IDs:
- Create or collect fake IDs that look similar to genuine ones
- Include obvious fakes and subtle fakes
- Different printing quality levels
- Various materials (paper, plastic, etc.)

## Training Tips

- Start with fewer epochs (5-10) to test
- Increase batch size if you have more memory
- Monitor validation accuracy to avoid overfitting
- Use more data augmentation if you have limited images

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
