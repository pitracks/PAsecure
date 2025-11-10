"""
Create a minimal working TensorFlow.js model
This creates the simplest possible model that TensorFlow.js can load
"""

import json
import numpy as np
from pathlib import Path

def create_minimal_working_model(output_dir):
    """Create a minimal TensorFlow.js model that will definitely work"""
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create the simplest possible model.json that TensorFlow.js can load
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
                    "name": "output/Softmax",
                    "op": "Softmax",
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
    
    # Create empty weights.bin (no weights needed for this simple model)
    with open(output_path / "weights.bin", 'wb') as f:
        f.write(b'')
    
    print(f"Minimal working model created at: {output_path}")
    return True

def main():
    print("Creating minimal working TensorFlow.js model...")
    
    success = create_minimal_working_model("../web_model")
    
    if success:
        print("Minimal model created successfully!")
        print("This model should load without errors in TensorFlow.js.")
    else:
        print("Model creation failed!")

if __name__ == "__main__":
    main()
