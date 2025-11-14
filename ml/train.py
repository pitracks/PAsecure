"""
PASecure CNN training script (TensorFlow/Keras)

Dataset layout (relative to this script):

data/
  train/
    senior_genuine/
    senior_counterfeit/
    pwd_genuine/
    pwd_counterfeit/
  val/
    senior_genuine/
    senior_counterfeit/
    pwd_genuine/
    pwd_counterfeit/

Usage (Windows PowerShell):
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r requirements.txt
  python ml/train.py --img 224 --batch 32 --epochs 10 --finetune_epochs 5

Outputs:
  - saved_model/         (Keras SavedModel)
  - ..\web_model\        (TF.js model.json + shards) ready for the web app
  - class_labels.txt     (class order used during training)
"""

import argparse
import os
import json
from pathlib import Path
import tensorflow as tf
from tensorflow import keras as K
from tensorflow.keras import layers as L


CLASS_ORDER = [
    'senior_genuine',
    'senior_counterfeit',
    'pwd_genuine',
    'pwd_counterfeit'
]


def build_datasets(data_dir: Path, img: int, batch: int):
    train_dir = data_dir / 'train'
    val_dir = data_dir / 'val'

    train_ds = K.preprocessing.image_dataset_from_directory(
        str(train_dir),
        image_size=(img, img),
        batch_size=batch,
        label_mode='categorical',
        class_names=CLASS_ORDER
    )
    val_ds = K.preprocessing.image_dataset_from_directory(
        str(val_dir),
        image_size=(img, img),
        batch_size=batch,
        label_mode='categorical',
        class_names=CLASS_ORDER
    )

    class_names = train_ds.class_names  # derived from subfolder names (sorted)
    print('Class names (from folders):', class_names)

    # Add data augmentation to training set only
    augmentation = K.Sequential([
        L.RandomFlip('horizontal'),
        L.RandomRotation(0.05),
        L.RandomZoom(0.1),
        L.RandomContrast(0.1),
    ])
    
    def augment_image(image, label):
        return augmentation(image, training=True), label
    
    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.map(augment_image, num_parallel_calls=autotune)
    train_ds = train_ds.shuffle(1024).prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)
    return train_ds, val_ds, class_names


def build_model(img: int, num_classes: int):
    base = K.applications.MobileNetV2(
        input_shape=(img, img, 3), include_top=False, weights='imagenet')
    base.trainable = False

    inputs = L.Input((img, img, 3))
    # Apply MobileNetV2 preprocessing (normalizes to [-1, 1])
    x = K.applications.mobilenet_v2.preprocess_input(inputs)
    x = base(x, training=False)
    x = L.GlobalAveragePooling2D()(x)
    x = L.Dropout(0.2)(x)
    outputs = L.Dense(num_classes, activation='softmax')(x)
    model = K.Model(inputs, outputs)
    model.compile(optimizer=K.optimizers.Adam(1e-3),
                  loss='categorical_crossentropy', metrics=['accuracy'])
    return model, base


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', type=str, default='ml/data', help='dataset root')
    ap.add_argument('--img', type=int, default=224)
    ap.add_argument('--batch', type=int, default=32)
    ap.add_argument('--epochs', type=int, default=10)
    ap.add_argument('--finetune_epochs', type=int, default=5)
    ap.add_argument('--export_dir', type=str, default='saved_model')
    ap.add_argument('--tfjs_dir', type=str, default='../web_model')
    args = ap.parse_args()

    data_dir = Path(args.data)
    export_dir = Path(args.export_dir)
    tfjs_dir = Path(args.tfjs_dir)
    tfjs_dir.mkdir(parents=True, exist_ok=True)

    train_ds, val_ds, class_names = build_datasets(data_dir, args.img, args.batch)

    # Assert class order aligns with app expectation
    expected = CLASS_ORDER
    if class_names != expected:
        print('\n[WARN] Class order differs from app expectation.')
        print('       App expects:', expected)
        print('       Found:      ', class_names)
    print('\nUsing class order:', class_names)
    with open('class_labels.txt', 'w', encoding='utf-8') as f:
        for c in class_names:
            f.write(c + '\n')

    model, base = build_model(args.img, len(class_names))

    print('\n[Phase 1] Training (frozen base) ...')
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs)

    print('\n[Phase 2] Fine-tuning (unfreeze tail) ...')
    base.trainable = True
    for l in base.layers[:-40]:
        l.trainable = False
    model.compile(optimizer=K.optimizers.Adam(1e-4),
                  loss='categorical_crossentropy', metrics=['accuracy'])
    model.fit(train_ds, validation_data=val_ds, epochs=args.finetune_epochs)

    print('\nEvaluating ...')
    metrics = model.evaluate(val_ds, return_dict=True)
    print('Validation metrics:', metrics)
    with open('metrics.json', 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2)

    print('\nSaving SavedModel ->', export_dir)
    model.save(str(export_dir))

    # Convert to TF.js
    try:
        import tensorflowjs as tfjs  # noqa: F401
        from tensorflowjs.converters import keras_tf_saved_model_conversion as conv
        # Use CLI conversion for reliability
        cmd = (
            f"tensorflowjs_converter --input_format=tf_saved_model "
            f"--signature_name=serving_default --saved_model_tags=serve "
            f"{export_dir} {tfjs_dir}"
        )
        print('\nConverting to TF.js with command:')
        print(cmd)
        os.system(cmd)
        print('TF.js model exported to:', tfjs_dir.resolve())
    except Exception as e:
        print('[WARN] tensorflowjs not available inside script:', e)
        print('Run conversion manually:')
        print('  pip install tensorflowjs')
        print(f'  tensorflowjs_converter --input_format=tf_saved_model \\\n+ --signature_name=serving_default --saved_model_tags=serve {export_dir} {tfjs_dir}')


if __name__ == '__main__':
    main()


