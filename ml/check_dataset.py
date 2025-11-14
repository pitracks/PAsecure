"""
Check dataset size and balance
"""
from pathlib import Path

def check_dataset(data_dir='ml/data'):
    data_path = Path(data_dir)
    train_dir = data_path / 'train'
    val_dir = data_path / 'val'
    
    print("=" * 60)
    print("DATASET ANALYSIS")
    print("=" * 60)
    
    classes = ['senior_genuine', 'senior_counterfeit', 'pwd_genuine', 'pwd_counterfeit']
    
    print("\n📊 Training Set:")
    train_total = 0
    for cls in classes:
        cls_dir = train_dir / cls
        if cls_dir.exists():
            count = len(list(cls_dir.glob('*.*')))
            train_total += count
            status = "✅" if count >= 50 else "⚠️ " if count >= 10 else "❌"
            print(f"  {status} {cls:20s}: {count:3d} images")
        else:
            print(f"  ❌ {cls:20s}: 0 images (folder missing)")
    
    print(f"\n  Total training images: {train_total}")
    
    print("\n📊 Validation Set:")
    val_total = 0
    for cls in classes:
        cls_dir = val_dir / cls
        if cls_dir.exists():
            count = len(list(cls_dir.glob('*.*')))
            val_total += count
            status = "✅" if count >= 10 else "⚠️ " if count >= 5 else "❌"
            print(f"  {status} {cls:20s}: {count:3d} images")
        else:
            print(f"  ❌ {cls:20s}: 0 images (folder missing)")
    
    print(f"\n  Total validation images: {val_total}")
    
    print("\n" + "=" * 60)
    print("RECOMMENDATIONS:")
    print("=" * 60)
    
    if train_total < 200:
        print("❌ CRITICAL: Dataset is too small!")
        print("   - Minimum recommended: 200 images total (50 per class)")
        print("   - Current: {} images total".format(train_total))
        print("   - You need {} more images".format(200 - train_total))
        print("\n   The model will NOT train properly with this little data.")
        print("   Please collect more ID images before training.")
    elif train_total < 400:
        print("⚠️  WARNING: Dataset is small but workable")
        print("   - Recommended: 400+ images total (100 per class)")
        print("   - Current: {} images total".format(train_total))
        print("   - More data will improve accuracy significantly")
    else:
        print("✅ Dataset size is good!")
        print("   - Current: {} images total".format(train_total))
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    check_dataset()

