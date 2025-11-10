"""
Dataset organization helper script for PASecure ID Verification

This script helps you organize your ID card images into the correct folder structure
for training the CNN model.

Usage:
    python ml\organize_dataset.py --source_dir "path\to\your\images" --split 0.8

The script will:
1. Look for images in the source directory
2. Organize them into train/val folders based on filename patterns
3. Create the correct class folders (senior_genuine, senior_counterfeit, pwd_genuine, pwd_counterfeit)
"""

import os
import shutil
import argparse
from pathlib import Path
import random

def organize_dataset(source_dir, split_ratio=0.8):
    """
    Organize dataset from source directory into train/val structure
    
    Expected filename patterns:
    - senior_genuine_*.jpg/png
    - senior_counterfeit_*.jpg/png  
    - pwd_genuine_*.jpg/png
    - pwd_counterfeit_*.jpg/png
    """
    
    source_path = Path(source_dir)
    if not source_path.exists():
        print(f"Error: Source directory {source_dir} does not exist!")
        return
    
    # Create target directories
    data_dir = Path("ml/data")
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"
    
    classes = ["senior_genuine", "senior_counterfeit", "pwd_genuine", "pwd_counterfeit"]
    
    for class_name in classes:
        (train_dir / class_name).mkdir(parents=True, exist_ok=True)
        (val_dir / class_name).mkdir(parents=True, exist_ok=True)
    
    # Find and organize images
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    organized_count = 0
    
    for class_name in classes:
        print(f"\nProcessing {class_name}...")
        
        # Find images matching this class pattern
        pattern = class_name.replace("_", "_")  # Keep underscores
        matching_files = []
        
        for ext in image_extensions:
            # Look for files starting with class name
            files = list(source_path.glob(f"{pattern}*{ext}"))
            files.extend(list(source_path.glob(f"{pattern}*{ext.upper()}")))
            matching_files.extend(files)
        
        print(f"Found {len(matching_files)} images for {class_name}")
        
        if not matching_files:
            print(f"Warning: No images found for {class_name}")
            continue
        
        # Split into train/val
        random.shuffle(matching_files)
        split_idx = int(len(matching_files) * split_ratio)
        train_files = matching_files[:split_idx]
        val_files = matching_files[split_idx:]
        
        # Copy to train directory
        for file_path in train_files:
            dest = train_dir / class_name / file_path.name
            shutil.copy2(file_path, dest)
            organized_count += 1
        
        # Copy to val directory  
        for file_path in val_files:
            dest = val_dir / class_name / file_path.name
            shutil.copy2(file_path, dest)
            organized_count += 1
        
        print(f"  Train: {len(train_files)} images")
        print(f"  Val: {len(val_files)} images")
    
    print(f"\n[SUCCESS] Organized {organized_count} images total!")
    print(f"Dataset structure created in: {data_dir.absolute()}")
    
    # Show final structure
    print("\nFinal dataset structure:")
    for split in ["train", "val"]:
        print(f"\n{split}/")
        for class_name in classes:
            count = len(list((data_dir / split / class_name).glob("*")))
            print(f"  {class_name}/ ({count} images)")

def main():
    parser = argparse.ArgumentParser(description="Organize ID card dataset for training")
    parser.add_argument("--source_dir", required=True, help="Directory containing your ID card images")
    parser.add_argument("--split", type=float, default=0.8, help="Train/val split ratio (default: 0.8)")
    
    args = parser.parse_args()
    
    print("PASecure Dataset Organization Tool")
    print("=" * 40)
    print(f"Source directory: {args.source_dir}")
    print(f"Train/Val split: {args.split:.1f}/{1-args.split:.1f}")
    print()
    
    organize_dataset(args.source_dir, args.split)

if __name__ == "__main__":
    main()
