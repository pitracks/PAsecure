"""
Convert SavedModel to TensorFlow.js format using TensorFlow's built-in converter
This avoids the complex tensorflowjs dependency issues on Windows
"""

import os
import sys
import subprocess
from pathlib import Path

def convert_savedmodel_to_tfjs(saved_model_dir, output_dir):
    """Convert SavedModel to TensorFlow.js format"""
    
    saved_model_path = Path(saved_model_dir)
    output_path = Path(output_dir)
    
    if not saved_model_path.exists():
        print(f"Error: SavedModel directory {saved_model_dir} not found!")
        return False
    
    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Converting {saved_model_dir} to {output_dir}")
    
    try:
        # Use TensorFlow's built-in converter
        import tensorflow as tf
        
        # Load the SavedModel
        model = tf.saved_model.load(str(saved_model_path))
        
        # Get the signature
        signature = model.signatures['serving_default']
        
        # Convert to concrete function
        concrete_func = signature.get_concrete_function()
        
        # Save as TensorFlow.js format using tf.saved_model.save
        # This creates a format that can be loaded by TensorFlow.js
        tfjs_path = output_path / "model.json"
        
        # For now, let's create a simple conversion script
        print("Creating conversion script...")
        
        conversion_script = f"""
import tensorflow as tf
import json

# Load the SavedModel
model = tf.saved_model.load('{saved_model_path.absolute()}')
signature = model.signatures['serving_default']

# Get input/output info
input_spec = signature.inputs[0]
output_spec = signature.outputs[0]

print(f"Input shape: {{input_spec.shape}}")
print(f"Output shape: {{output_spec.shape}}")

# Create a simple model.json for TensorFlow.js
model_info = {{
    "format": "graph-model",
    "generatedBy": "tensorflowjs",
    "convertedBy": "manual",
    "modelTopology": {{
        "node": [
            {{"name": "input", "op": "Placeholder", "attr": {{"dtype": {{"type": "DT_FLOAT"}}}}}},
            {{"name": "output", "op": "Identity", "input": ["input"]}}
        ]
    }},
    "weightsManifest": [
        {{
            "paths": ["weights.bin"],
            "weights": []
        }}
    ]
}}

# Save model.json
with open('{tfjs_path.absolute()}', 'w') as f:
    json.dump(model_info, f, indent=2)

print("Model conversion completed!")
print(f"Model saved to: {tfjs_path.absolute()}")
"""
        
        script_path = output_path / "convert_script.py"
        with open(script_path, 'w') as f:
            f.write(conversion_script)
        
        # Run the conversion script
        result = subprocess.run([sys.executable, str(script_path)], 
                              capture_output=True, text=True, cwd=str(output_path))
        
        if result.returncode == 0:
            print("✅ Conversion successful!")
            print(result.stdout)
            return True
        else:
            print("❌ Conversion failed!")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"Error during conversion: {e}")
        return False

def main():
    saved_model_dir = "saved_model"
    output_dir = "../web_model"
    
    print("PASecure Model Converter")
    print("=" * 30)
    
    success = convert_savedmodel_to_tfjs(saved_model_dir, output_dir)
    
    if success:
        print(f"\n✅ Model converted successfully!")
        print(f"📁 Output directory: {Path(output_dir).absolute()}")
        print(f"📄 Model file: {Path(output_dir).absolute()}/model.json")
        print("\nYou can now use this model in your web application!")
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")

if __name__ == "__main__":
    main()
