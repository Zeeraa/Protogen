#!/bin/bash

# Specify the directory for the virtual environment
ENV_DIR="venv"

# Check if the virtual environment directory already exists
if [ -d "$ENV_DIR" ]; then
    echo "Virtual environment already exists in $ENV_DIR."
else
    # Create the virtual environment
    echo "Creating virtual environment in $ENV_DIR..."
    python3 -m venv $ENV_DIR

    # Activate the virtual environment
    echo "Activating virtual environment..."
    source $ENV_DIR/bin/activate

    # Install required dependencies from a requirements.txt file (optional)
    if [ -f "requirements.txt" ]; then
        echo "Installing dependencies from requirements.txt..."
        pip install -r requirements.txt
    else
        echo "No requirements.txt found, skipping dependency installation."
    fi
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source $ENV_DIR/bin/activate

# Confirmation message
echo "Virtual environment is set up and activated."