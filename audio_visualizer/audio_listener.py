#!/usr/bin/env python3
"""
Audio Visualizer Listener
Captures audio from microphone, performs FFT analysis, and publishes data to MQTT
"""

import argparse
import json
import numpy as np
import pyaudio
import paho.mqtt.client as mqtt
import time
import sys
import os
import queue
from collections import deque
from typing import Dict, Any, Optional

# Try to import new MQTT API, fall back to old if not available
try:
    from paho.mqtt.client import CallbackAPIVersion
    MQTT_API_V2_AVAILABLE = True
except ImportError:
    MQTT_API_V2_AVAILABLE = False

# Audio settings
CHUNK_SIZE = 1024
FORMAT = pyaudio.paInt16
SAMPLE_RATE = 44100
MAX_INT16 = 32768.0

# Frequency band definitions (Hz)
FREQUENCY_BANDS = {
    'sub_bass': (20, 60),
    'bass': (60, 250),
    'low_mids': (250, 500),
    'mids': (500, 2000),
    'high_mids': (2000, 4000),
    'highs': (4000, 8000),
    'presence': (8000, 16000)
}

# Adaptive settings
HISTORY_SIZE = 60  # Number of frames to keep for adaptation
BEAT_THRESHOLD_MULTIPLIER = 1.3  # Beat detection threshold


class AudioVisualizer:
    def __init__(self, device_index: Optional[int], sensitivity: float, 
                 mqtt_host: str, mqtt_port: int, mqtt_topic: str, mqtt_config_topic: str):
        self.device_index = device_index
        self.selected_device_name = None
        self.sensitivity = sensitivity
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.mqtt_topic = mqtt_topic
        self.mqtt_config_topic = mqtt_config_topic
        
        # Audio components
        self.audio = pyaudio.PyAudio()
        self.stream = None
        self.stream_healthy = False
        self.audio_queue = queue.Queue()
        
        # MQTT client (use API v2 if available to avoid deprecation warning)
        if MQTT_API_V2_AVAILABLE:
            self.mqtt_client = mqtt.Client(CallbackAPIVersion.VERSION2)
        else:
            self.mqtt_client = mqtt.Client()
        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_message = self.on_mqtt_message
        self.mqtt_connected = False
        
        # Adaptive tracking
        self.energy_history = deque(maxlen=HISTORY_SIZE)
        self.bass_history = deque(maxlen=HISTORY_SIZE)
        
        # Current settings (can be updated via MQTT)
        self.enabled = True
        self.current_sensitivity = sensitivity
        
        # Performance tracking
        self.last_publish_time = 0
        self.publish_interval = 0.02  # Max publish rate ~50 Hz (actually limited by CHUNK_SIZE to 43 Hz)
        
    def on_mqtt_connect(self, client, userdata, flags, rc, properties=None):
        """Called when connected to MQTT broker"""
        if rc == 0:
            print(f"Connected to MQTT broker at {self.mqtt_host}:{self.mqtt_port}")
            self.mqtt_connected = True
            # Subscribe to config updates
            client.subscribe(self.mqtt_config_topic)
        else:
            print(f"Failed to connect to MQTT broker, code: {rc}")
            
    def on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT config messages"""
        try:
            config = json.loads(msg.payload.decode())
            if 'sensitivity' in config:
                self.current_sensitivity = float(config['sensitivity'])
                print(f"Updated sensitivity to {self.current_sensitivity}")
            if 'enabled' in config:
                self.enabled = bool(config['enabled'])
                print(f"Audio visualizer {'enabled' if self.enabled else 'disabled'}")
            if 'device_index' in config:
                new_device = config['device_index']
                if new_device != self.device_index:
                    print(f"Changing audio device to {new_device}")
                    self.restart_audio_stream(new_device)
        except Exception as e:
            print(f"Error processing config update: {e}")
    
    def restart_audio_stream(self, new_device_index: Optional[int]):
        """Restart audio stream with new device and reset name anchor"""
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except:
                pass
            self.stream = None
        self.device_index = new_device_index
        self.selected_device_name = None  # Reset selection name to anchor new index
        self.start_audio_stream()
    
    def start_audio_stream(self):
        """Initialize and start audio input stream with stale list clearance and index auto-recovery"""
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except:
                pass
            self.stream = None
            
        # Re-create PyAudio instance to clear out PortAudio's cached device lists.
        # This is vital on Raspberry Pi because dynamic USB dropouts won't be seen by a cached list object.
        try:
            self.audio.terminate()
        except:
            pass
        try:
            self.audio = pyaudio.PyAudio()
        except Exception as e:
            print(f"Error re-initializing PyAudio context: {e}")
            self.stream_healthy = False
            return

        # Auto-detect if device index changed due to USB re-plugging (card re-enumeration)
        if self.device_index is not None:
            device_found = False
            device_count = self.audio.get_device_count()
            
            # Step A: If we already knew the name, look for a device matching that exact name or substring
            if self.selected_device_name:
                for i in range(device_count):
                    try:
                        info = self.audio.get_device_info_by_index(i)
                        if info['maxInputChannels'] > 0 and info['name'] == self.selected_device_name:
                            if self.device_index != i:
                                print(f"USB Re-plug/migration detected! Dynamically migrating device index from {self.device_index} to {i} (matching name: {info['name']})")
                                self.device_index = i
                            device_found = True
                            break
                    except:
                        continue
            
            # Step B: If exact name match wasn't found or not set yet, but current index is invalid, try to find any USB input device
            if not device_found:
                try:
                    # Test if current index works
                    info = self.audio.get_device_info_by_index(self.device_index)
                    if info['maxInputChannels'] > 0:
                        device_found = True
                        if not self.selected_device_name:
                            self.selected_device_name = info['name']
                except:
                    # Index is dead or invalid. Search for any standard USB card
                    for i in range(device_count):
                        try:
                            info = self.audio.get_device_info_by_index(i)
                            if info['maxInputChannels'] > 0 and ("USB" in info['name'] or "Mic" in info['name']):
                                print(f"Selected index was offline. Found substitute USB device at index {i}: {info['name']}")
                                self.device_index = i
                                self.selected_device_name = info['name']
                                device_found = True
                                break
                        except:
                            continue
                            
        # Try to open the stream
        try:
            self.stream = self.audio.open(
                format=FORMAT,
                channels=1,
                rate=SAMPLE_RATE,
                input=True,
                input_device_index=self.device_index,
                frames_per_buffer=CHUNK_SIZE
            )
            self.stream_healthy = True
            
            # Store the device name on first success so we can find it again if it drops
            if self.device_index is not None and not self.selected_device_name:
                try:
                    info = self.audio.get_device_info_by_index(self.device_index)
                    self.selected_device_name = info['name']
                    print(f"Locked on device name: {self.selected_device_name}")
                except:
                    pass
                    
            print(f"Audio stream started on device {self.device_index} (polling mode)")
        except Exception as e:
            print(f"Error starting audio stream: {e}")
            print("Audio visualizer will continue but without audio input")
            self.stream_healthy = False
            self.stream = None
    
    def connect_mqtt(self):
        """Connect to MQTT broker"""
        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, 60)
            self.mqtt_client.loop_start()
        except Exception as e:
            print(f"Error connecting to MQTT: {e}")
            sys.exit(1)
    
    def calculate_fft(self, audio_data: np.ndarray) -> np.ndarray:
        """Perform FFT on audio data"""
        # Apply Hamming window to reduce spectral leakage
        windowed = audio_data * np.hamming(len(audio_data))
        # Compute FFT
        fft = np.fft.rfft(windowed)
        # Get magnitude spectrum
        magnitude = np.abs(fft)
        return magnitude
    
    def get_frequency_band_energy(self, magnitude: np.ndarray, freq_range: tuple) -> float:
        """Calculate energy in a specific frequency band"""
        freqs = np.fft.rfftfreq(CHUNK_SIZE, 1.0 / SAMPLE_RATE)
        mask = (freqs >= freq_range[0]) & (freqs <= freq_range[1])
        band_energy = np.sum(magnitude[mask] ** 2)
        return float(band_energy)
    
    def normalize_value(self, value: float, history: deque, sensitivity: float) -> float:
        """Normalize value based on recent history with a noise floor threshold"""
        # Noise floor: If value or average history is extremely low, clamp to 0 to avoid amplifying silence
        MIN_NOISE_THRESHOLD = 0.005
        
        if len(history) < 5:
            if value < MIN_NOISE_THRESHOLD:
                return 0.0
            return float(min(value * sensitivity, 1.0))
        
        # Calculate adaptive range
        avg = float(np.mean(history))
        max_val = float(np.max(history))
        
        # If the environment is extremely quiet, don't auto-amplify the silence
        if max_val < MIN_NOISE_THRESHOLD or value < MIN_NOISE_THRESHOLD:
            return 0.0
        
        if max_val > 0:
            # Normalize to 0-1 range with sensitivity adjustment
            normalized = (value / max_val) * sensitivity
            return float(min(normalized, 1.0))
        return 0.0
    
    def detect_beat(self, bass_energy: float) -> bool:
        """Simple beat detection based on bass energy spike"""
        if len(self.bass_history) < 10:
            return False
        
        avg_bass = float(np.mean(self.bass_history))
        return bool(bass_energy > (avg_bass * BEAT_THRESHOLD_MULTIPLIER))
    
    def detect_music_style(self, band_energies: Dict[str, float]) -> str:
        """Detect music style based on frequency distribution with smoothing/hysteresis"""
        total_energy = sum(band_energies.values())
        if total_energy == 0:
            return 'silence'
        
        # Calculate energy ratios
        bass_ratio = (band_energies['sub_bass'] + band_energies['bass']) / total_energy
        mid_ratio = (band_energies['low_mids'] + band_energies['mids']) / total_energy
        high_ratio = (band_energies['high_mids'] + band_energies['highs'] + band_energies['presence']) / total_energy
        
        # Determine the raw dominant band
        current_style = 'balanced'
        if bass_ratio > 0.45:
            current_style = 'bass_heavy'
        elif mid_ratio > 0.45:
            current_style = 'vocal'
        elif high_ratio > 0.35:
            current_style = 'bright'
        elif total_energy < 0.01:
            current_style = 'quiet'
            
        # Initialize style history if not exists
        if not hasattr(self, '_style_history'):
            self._style_history = deque(maxlen=25) # Smooth over ~25 frames (~0.5 seconds)
            
        self._style_history.append(current_style)
        
        # Return the most common style in the history (majority vote)
        styles_list = list(self._style_history)
        return max(set(styles_list), key=styles_list.count)
    
    def process_audio(self):
        """Main audio processing loop"""
        print("Starting audio processing...")
        
        consecutive_errors = 0
        max_consecutive_errors = 10
        last_data_receive_time = time.time()
        
        while True:
            try:
                if not self.enabled:
                    time.sleep(0.1)
                    continue
                
                # Check if stream is healthy or if we haven't received data in a while
                current_time = time.time()
                is_stalled = (self.stream_healthy and self.stream is not None and (current_time - last_data_receive_time > 2.0))
                
                if not self.stream_healthy or self.stream is None or is_stalled:
                    if is_stalled:
                        print("Audio stream stall detected (no data received for 2 seconds)")
                        self.stream_healthy = False
                        
                    # Send zero data to indicate no audio
                    if current_time - self.last_publish_time >= self.publish_interval:
                        self.last_publish_time = current_time
                        zero_data = {
                            'timestamp': current_time,
                            'intensity': 0.0,
                            'bands': {band: 0.0 for band in FREQUENCY_BANDS.keys()},
                            'beat': False,
                            'style': 'silence'
                        }
                        if self.mqtt_connected:
                            self.mqtt_client.publish(self.mqtt_topic, json.dumps(zero_data))
                    
                    time.sleep(0.1)
                    
                    # Try to restart stream immediately on first failure, then every 1 second
                    if consecutive_errors == 1 or (consecutive_errors % 10 == 0 and consecutive_errors > 0):
                        print("Attempting to restart audio stream...")
                        self.start_audio_stream()
                        last_data_receive_time = time.time()  # Reset timeout
                    consecutive_errors += 1
                    continue
                
                # Read audio data with error protection
                try:
                    audio_data = self.stream.read(CHUNK_SIZE, exception_on_overflow=False)
                    last_data_receive_time = time.time()  # Successfully got data!
                    consecutive_errors = 0  # Reset error counter on successful read
                except IOError as e:
                    # In standard USB audio, input overflow error sequence uses [Errno -9981] Input overflowed
                    # It's completely normal when CPU is loaded on Raspberry Pi and doesn't mean stream is dead
                    if hasattr(e, 'errno') and e.errno == pyaudio.paInputOverflowed:
                        # Keep receipt timer alive since the card is actively talking to us and giving us overflow flags
                        last_data_receive_time = time.time()
                        # Skip this frame and continue instead of declaring stream dead!
                        time.sleep(0.01)
                        continue
                        
                    print(f"Stream read error: {e}")
                    self.stream_healthy = False
                    consecutive_errors += 1
                    if consecutive_errors >= max_consecutive_errors:
                        print("Too many consecutive errors, marking stream as unhealthy")
                    time.sleep(0.1)
                    continue
                
                audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / MAX_INT16
                
                # Calculate FFT
                magnitude = self.calculate_fft(audio_array)
                
                # Calculate energy for each frequency band
                band_energies_raw = {}
                for band_name, freq_range in FREQUENCY_BANDS.items():
                    energy = self.get_frequency_band_energy(magnitude, freq_range)
                    band_energies_raw[band_name] = energy
                
                # Calculate overall energy
                total_energy = sum(band_energies_raw.values())
                self.energy_history.append(total_energy)
                
                # Track bass for beat detection
                bass_energy = band_energies_raw['bass'] + band_energies_raw['sub_bass']
                self.bass_history.append(bass_energy)
                
                # Normalize band energies
                band_energies = {}
                for band_name, energy in band_energies_raw.items():
                    normalized = self.normalize_value(energy, self.energy_history, self.current_sensitivity)
                    band_energies[band_name] = round(float(normalized), 3)
                
                # Overall intensity (0-1)
                intensity = self.normalize_value(total_energy, self.energy_history, self.current_sensitivity)
                
                # Beat detection
                is_beat = self.detect_beat(bass_energy)
                
                # Music style detection
                music_style = self.detect_music_style(band_energies_raw)
                
                # Throttle publishing
                current_time = time.time()
                if current_time - self.last_publish_time < self.publish_interval:
                    continue
                self.last_publish_time = current_time
                
                # Prepare data payload
                data = {
                    'timestamp': float(current_time),
                    'intensity': round(float(intensity), 3),
                    'bands': band_energies,
                    'beat': bool(is_beat),
                    'style': str(music_style)
                }
                
                # Publish to MQTT
                if self.mqtt_connected:
                    self.mqtt_client.publish(self.mqtt_topic, json.dumps(data))
                
            except KeyboardInterrupt:
                print("\nShutting down...")
                break
            except Exception as e:
                print(f"Error processing audio: {e}")
                consecutive_errors += 1
                if consecutive_errors >= max_consecutive_errors:
                    print("Too many errors, marking stream as unhealthy")
                    self.stream_healthy = False
                time.sleep(0.1)
    
    def cleanup(self):
        """Clean up resources"""
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
            except Exception as e:
                print(f"Error closing stream: {e}")
        try:
            self.audio.terminate()
        except Exception as e:
            print(f"Error terminating audio: {e}")
        try:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        except Exception as e:
            print(f"Error disconnecting MQTT: {e}")
        print("Cleanup complete")


def list_audio_devices():
    """List all available audio input devices"""
    # Suppress ALSA warnings
    devnull = os.open(os.devnull, os.O_WRONLY)
    old_stderr = os.dup(2)
    os.dup2(devnull, 2)
    
    try:
        audio = pyaudio.PyAudio()
        
        # Restore stderr for printing
        os.dup2(old_stderr, 2)
        print("\nAvailable audio input devices:")
        print("-" * 60)
        
        device_count = audio.get_device_count()
        found_devices = False
        
        # Suppress ALSA again for device enumeration
        os.dup2(devnull, 2)
        
        for i in range(device_count):
            try:
                info = audio.get_device_info_by_index(i)
                if info['maxInputChannels'] > 0:
                    found_devices = True
                    # Restore stderr for printing device info
                    os.dup2(old_stderr, 2)
                    print(f"Device {i}: {info['name']}")
                    print(f"  Sample Rate: {int(info['defaultSampleRate'])} Hz")
                    print(f"  Input Channels: {info['maxInputChannels']}")
                    print()
                    # Suppress again for next iteration
                    os.dup2(devnull, 2)
            except Exception:
                # Skip devices that can't be queried
                continue
        
        # Restore stderr
        os.dup2(old_stderr, 2)
        
        if not found_devices:
            print("No audio input devices found")
        
        audio.terminate()
    except Exception as e:
        os.dup2(old_stderr, 2)
        print(f"Error listing audio devices: {e}")
        sys.exit(1)
    finally:
        try:
            os.dup2(old_stderr, 2)
            os.close(devnull)
            os.close(old_stderr)
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description='Audio Visualizer Listener')
    parser.add_argument('--device', type=int, default=None, help='Audio input device index')
    parser.add_argument('--list-devices', action='store_true', help='List available audio devices')
    parser.add_argument('--sensitivity', type=float, default=1.5, help='Sensitivity multiplier (default: 1.5)')
    parser.add_argument('--mqtt-host', type=str, default='localhost', help='MQTT broker host')
    parser.add_argument('--mqtt-port', type=int, default=1883, help='MQTT broker port')
    parser.add_argument('--mqtt-topic', type=str, default='protogen/audio-visualizer/data', 
                       help='MQTT topic for audio data')
    parser.add_argument('--mqtt-config-topic', type=str, default='protogen/audio-visualizer/config',
                       help='MQTT topic for config updates')
    
    args = parser.parse_args()
    
    if args.list_devices:
        list_audio_devices()
        return
    
    print("Audio Visualizer Listener Starting...")
    print(f"Device: {args.device if args.device is not None else 'default'}")
    print(f"Sensitivity: {args.sensitivity}")
    print(f"MQTT: {args.mqtt_host}:{args.mqtt_port}")
    print(f"Data Topic: {args.mqtt_topic}")
    print(f"Config Topic: {args.mqtt_config_topic}")
    
    visualizer = AudioVisualizer(
        device_index=args.device,
        sensitivity=args.sensitivity,
        mqtt_host=args.mqtt_host,
        mqtt_port=args.mqtt_port,
        mqtt_topic=args.mqtt_topic,
        mqtt_config_topic=args.mqtt_config_topic
    )
    
    try:
        visualizer.connect_mqtt()
        visualizer.start_audio_stream()
        visualizer.process_audio()
    finally:
        visualizer.cleanup()


if __name__ == '__main__':
    main()
