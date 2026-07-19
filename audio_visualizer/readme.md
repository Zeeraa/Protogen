# Audio Visualizer

This module captures audio from a microphone, performs real-time FFT analysis, and publishes the data to MQTT for the Protogen backend to consume.

**Note**: The audio visualizer is disabled by default to conserve processing power. Enable it via the web UI when you want to use audio-reactive features.

## Features

- Real-time FFT analysis with 7 frequency bands
- Adaptive normalization that adjusts to different music volumes
- Beat detection
- Music style detection (bass_heavy, vocal, bright, balanced, quiet, silence)
- Live configuration updates via MQTT
- Dynamic audio device switching

## Installation

**System Requirements**: The `portaudio19-dev` package is required for PyAudio. This is automatically installed by the main `install.sh` script.

If you need to install it manually:
```bash
sudo apt-get install portaudio19-dev
```

**Note**: Python dependencies must be installed in a virtual environment due to PEP 668 (externally-managed-environment).

```bash
cd /home/pi/protogen/audio_visualizer

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

The installation script (`install.sh`) automatically sets this up for you.

## Usage

**IMPORTANT**: This script is managed by the Protogen backend. Do NOT run it manually or as a systemd service in production - the backend spawns and controls this process automatically.

### Via Web UI (Production Use)

1. Navigate to the Audio Visualizer page in the web interface
2. Enable the audio visualizer using the toggle switch
3. Select your audio input device from the dropdown
4. Adjust sensitivity as needed
5. Click "Save Configuration" 
6. Click "Start" to begin visualization

The backend will automatically spawn this Python script with the correct parameters.

### Manual Testing (Development Only)

For testing the script independently during development:

List available audio devices:
```bash
cd /home/pi/protogen/audio_visualizer
venv/bin/python3 audio_listener.py --list-devices
```

Run with specific device:
```bash
venv/bin/python3 audio_listener.py --device 0 --sensitivity 1.5
```

Run with default device:
```bash
venv/bin/python3 audio_listener.py
```

## Configuration

The listener can be configured via command-line arguments or live via MQTT:

- `--device`: Audio input device index (optional, uses default if not specified)
- `--sensitivity`: Sensitivity multiplier (default: 1.5)
- `--mqtt-host`: MQTT broker host (default: localhost)
- `--mqtt-port`: MQTT broker port (default: 1883)
- `--mqtt-topic`: Topic for publishing audio data (default: protogen/audio-visualizer/data)
- `--mqtt-config-topic`: Topic for receiving config updates (default: protogen/audio-visualizer/config)

## MQTT Messages

### Published Data (audio data topic)
```json
{
  "timestamp": 1234567890.123,
  "intensity": 0.75,
  "bands": {
    "sub_bass": 0.8,
    "bass": 0.9,
    "low_mids": 0.6,
    "mids": 0.5,
    "high_mids": 0.4,
    "highs": 0.3,
    "presence": 0.2
  },
  "beat": true,
  "style": "bass_heavy"
}
```

### Config Updates (config topic)
```json
{
  "sensitivity": 2.0,
  "enabled": true,
  "device_index": 1
}
```

## Frequency Bands

- **sub_bass**: 20-60 Hz
- **bass**: 60-250 Hz
- **low_mids**: 250-500 Hz
- **mids**: 500-2000 Hz
- **high_mids**: 2000-4000 Hz
- **highs**: 4000-8000 Hz
- **presence**: 8000-16000 Hz
