"""
Create a simple dummy model that will work for testing
This creates a minimal model that TensorFlow.js can load
"""

import json
import numpy as np
from pathlib import Path

def create_dummy_tfjs_model(output_dir):
    """Create a minimal TensorFlow.js model that will load without errors"""
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create a very simple model.json that TensorFlow.js can parse
    model_json = {
        "format": "graph-model",
        "generatedBy": "tensorflowjs",
        "convertedBy": "manual",
        "modelTopology": {
            "node": [
                {
                    "name": "input_1",
                    "op": "Placeholder",
                    "attr": {
                        "dtype": {"type": "DT_FLOAT"},
                        "shape": {
                            "shape": {
                                "dim": [
                                    {"size": "1"},
                                    {"size": "224"},
                                    {"size": "224"},
                                    {"size": "3"}
                                ]
                            }
                        }
                    }
                },
                {
                    "name": "output",
                    "op": "Identity",
                    "input": ["input_1"],
                    "attr": {
                        "T": {"type": "DT_FLOAT"}
                    }
                }
            ]
        },
        "weightsManifest": [
            {
                "paths": ["weights.bin"],
                "weights": []
            }
        ]
    }
    
    # Save model.json
    with open(output_path / "model.json", 'w') as f:
        json.dump(model_json, f, indent=2)
    
    # Create empty weights.bin
    with open(output_path / "weights.bin", 'wb') as f:
        f.write(b'')
    
    print(f"Dummy TensorFlow.js model created at: {output_path}")
    return True

def main():
    print("Creating dummy TensorFlow.js model for testing...")
    
    success = create_dummy_tfjs_model("../web_model")
    
    if success:
        print("Dummy model created successfully!")
        print("This model will load but won't do real analysis.")
        print("For real CNN analysis, you need to train with real data and convert properly.")
    else:
        print("Model creation failed!")

if __name__ == "__main__":
    main()
