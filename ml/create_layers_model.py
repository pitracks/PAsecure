"""
Create a TensorFlow.js Layers model
This creates a model in the Layers format which is more compatible
"""

import json
import numpy as np
from pathlib import Path

def create_layers_model(output_dir):
    """Create a TensorFlow.js Layers model"""
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create a Layers model.json
    model_json = {
        "modelTopology": {
            "keras_version": "2.13.1",
            "backend": "tensorflow",
            "model_config": {
                "class_name": "Sequential",
                "config": {
                    "name": "sequential",
                    "layers": [
                        {
                            "class_name": "InputLayer",
                            "config": {
                                "batch_input_shape": [None, 224, 224, 3],
                                "dtype": "float32",
                                "sparse": False,
                                "ragged": False,
                                "name": "input_1"
                            },
                            "name": "input_1",
                            "inbound_nodes": []
                        },
                        {
                            "class_name": "Dense",
                            "config": {
                                "name": "dense",
                                "trainable": True,
                                "dtype": "float32",
                                "units": 4,
                                "activation": "softmax",
                                "use_bias": True,
                                "kernel_initializer": {
                                    "class_name": "GlorotUniform",
                                    "config": {"seed": None}
                                },
                                "bias_initializer": {
                                    "class_name": "Zeros",
                                    "config": {}
                                },
                                "kernel_regularizer": None,
                                "bias_regularizer": None,
                                "activity_regularizer": None,
                                "kernel_constraint": None,
                                "bias_constraint": None
                            },
                            "name": "dense",
                            "inbound_nodes": [["input_1", 0, 0, {}]]
                        }
                    ],
                    "name": "sequential"
                }
            },
            "node_names": ["input_1", "dense"],
            "node_names_to_sequential_layers": {
                "input_1": 0,
                "dense": 1
            }
        },
        "weightsManifest": [
            {
                "paths": ["weights.bin"],
                "weights": [
                    {
                        "name": "dense/kernel",
                        "shape": [150528, 4],
                        "dtype": "float32"
                    },
                    {
                        "name": "dense/bias", 
                        "shape": [4],
                        "dtype": "float32"
                    }
                ]
            }
        ]
    }
    
    # Save model.json
    with open(output_path / "model.json", 'w') as f:
        json.dump(model_json, f, indent=2)
    
    # Create weights.bin with dummy weights
    weights_data = b''
    
    # Add dummy weights for dense layer
    kernel_weights = np.random.randn(150528, 4).astype(np.float32)
    bias_weights = np.random.randn(4).astype(np.float32)
    
    weights_data += kernel_weights.tobytes()
    weights_data += bias_weights.tobytes()
    
    with open(output_path / "weights.bin", 'wb') as f:
        f.write(weights_data)
    
    print(f"Layers model created at: {output_path}")
    return True

def main():
    print("Creating TensorFlow.js Layers model...")
    
    success = create_layers_model("../web_model")
    
    if success:
        print("Layers model created successfully!")
        print("This should work with tf.loadLayersModel()")
    else:
        print("Model creation failed!")

if __name__ == "__main__":
    main()
