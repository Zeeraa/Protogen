#!/usr/bin/env python3
"""
Audio Visualizer Listener (sounddevice version)
Captures audio from microphone using sounddevice, performs FFT analysis, and publishes data to MQTT.
Supports user-defined low-threshold and intensity parameters instead of history-based volume adaptation.
"""

import argparse
import json
import numpy as np
import sounddevice as sd
import paho.mqtt.client as mqtt
import time
import sys
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
SAMPLE_RATE = 44100

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

# Beat detection settings
BEAT_HISTORY_SIZE = 15
BEAT_THRESHOLD_MULTIPLIER = 1.35


class AudioVisualizer:
    def __init__(self, device_index: Optional[int], low_threshold: float, intensity: float,
                 mqtt_host: str, mqtt_port: int, mqtt_topic: str, mqtt_config_topic: str):
        self.device_index = device_index
        self.low_threshold = low_threshold
        self.intensity = intensity
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.mqtt_topic = mqtt_topic
        self.mqtt_config_topic = mqtt_config_topic
        
        # Audio components
        self.stream = None
        self.audio_queue = queue.Queue()
        
        # MQTT client (use API v2 if available to avoid deprecation warning)
        if MQTT_API_V2_AVAILABLE:
            self.mqtt_client = mqtt.Client(CallbackAPIVersion.VERSION2)
        else:
            self.mqtt_client = mqtt.Client()
        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_message = self.on_mqtt_message
        self.mqtt_connected = False
        
        # Beat tracking (short rolling window for transient spike detection only)
        self.bass_history = deque(maxlen=BEAT_HISTORY_SIZE)
        
        # Current settings
        self.enabled = True
        
        # Performance tracking
        self.last_publish_time = 0
        self.publish_interval = 0.02  # Max publish rate ~50 Hz
        
    def on_mqtt_connect(self, client, userdata, flags, rc, properties=None):
        """Called when connected to MQTT broker"""
        if rc == 0:
            print(f"Connected to MQTT broker at {self.mqtt_host}:{self.mqtt_port}")
            self.mqtt_connected = True
            client.subscribe(self.mqtt_config_topic)
        else:
            print(f"Failed to connect to MQTT broker, code: {rc}")
            
    def on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT config messages"""
        try:
            config = json.loads(msg.payload.decode())
            if 'lowThreshold' in config:
                self.low_threshold = float(config['lowThreshold'])
                print(f"Updated low_threshold to {self.low_threshold}")
            if 'intensity' in config:
                self.intensity = float(config['intensity'])
                print(f"Updated intensity to {self.intensity}")
            if 'enabled' in config:
                self.enabled = bool(config['enabled'])
                print(f"Audio visualizer {'enabled' if self.enabled else 'disabled'}")
        except Exception as e:
            print(f"Error processing config update: {e}")
            
    def audio_callback(self, indata, frames, time_info, status):
        """sounddevice input stream audio callback"""
        if status:
            pass
        if self.enabled:
            # Put first channel data copy into the queue
            self.audio_queue.put(indata[:, 0].copy())
            
    def start_audio_stream(self):
        """Initialize and start sounddevice input stream"""
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except:
                pass
            self.stream = None
            
        try:
            # Print chosen device details
            device_info = sd.query_devices(self.device_index, 'input')
            print(f"Opening audio stream on device {self.device_index if self.device_index is not None else 'Default'}: {device_info['name']}")
            
            self.stream = sd.InputStream(
                device=self.device_index,
                channels=1,
                samplerate=SAMPLE_RATE,
                blocksize=CHUNK_SIZE,
                callback=self.audio_callback
            )
            self.stream.start()
            print("Audio stream started successfully (sounddevice mode)")
        except Exception as e:
            print(f"Error starting sounddevice audio stream: {e}")
            print("Audio visualizer running without audio input")
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
        windowed = audio_data * np.hamming(len(audio_data))
        fft = np.fft.rfft(windowed)
        magnitude = np.abs(fft)
        return magnitude
        
    def get_frequency_band_energy(self, magnitude: np.ndarray, freq_range: tuple) -> float:
        """Calculate energy in a specific frequency band"""
        freqs = np.fft.rfftfreq(CHUNK_SIZE, 1.0 / SAMPLE_RATE)
        mask = (freqs >= freq_range[0]) & (freqs <= freq_range[1])
        if not np.any(mask):
            return 0.0
        # Use mean magnitude inside the band logic
        band_energy = np.mean(magnitude[mask])
        return float(band_energy)
        
    def process_value(self, raw_value: float, threshold: float, multiplier: float) -> float:
        """Process value using low threshold and multiplier"""
        if raw_value < threshold:
            return 0.0
        # Map values above threshold to [0.0, 1.0]
        val = (raw_value - threshold) * multiplier
        return float(max(0.0, min(1.0, val)))
        
    def detect_beat(self, bass_energy: float) -> bool:
        """Simple beat detection based on relative recruiting bass energy spike"""
        if len(self.bass_history) < 5:
            return False
        avg_bass = float(np.mean(self.bass_history))
        if avg_bass < 0.001:
            return False
        return bool(bass_energy > (avg_bass * BEAT_THRESHOLD_MULTIPLIER))
        
    def process_audio(self):
        """Main audio processing loop"""
        print("Starting audio processing...")
        
        while True:
            try:
                if not self.enabled:
                    time.sleep(0.1)
                    continue
                
                # Retrieve audio block from queue
                try:
                    audio_array = self.audio_queue.get(timeout=0.2)
                except queue.Empty:
                    # If stream is down or silent, publish zero data to keep UI alive
                    current_time = time.time()
                    if current_time - self.last_publish_time >= self.publish_interval:
                        self.last_publish_time = current_time
                        zero_data = {
                            'timestamp': current_time,
                            'intensity': 0.0,
                            'bands': {band: 0.0 for band in FREQUENCY_BANDS.keys()},
                            'beat': False
                        }
                        if self.mqtt_connected:
                            self.mqtt_client.publish(self.mqtt_topic, json.dumps(zero_data))
                    continue
                
                # Calculate FFT
                magnitude = self.calculate_fft(audio_array)
                
                # Calculate raw energy for each band
                band_energies_raw = {}
                for band_name, freq_range in FREQUENCY_BANDS.items():
                    band_energies_raw[band_name] = self.get_frequency_band_energy(magnitude, freq_range)
                
                # Calculate overall raw energy as Root Mean Square (RMS)
                rms_intensity = float(np.linalg.norm(audio_array) / np.sqrt(len(audio_array)))
                
                # Active music event adaptive scale (Dynamic Range AGC)
                # To maintain a highly punchy, non-clipping signal, we use a true peak envelope follower.
                # In order to avoid pinning at 100% when the music gets really loud, the peak detector
                # tracks the maximum volume peak with an instant attack coefficient and a moderate decay.
                # At 50fps, a decay factor of 0.993 lets the peak hold the volume ceiling across beats,
                # decaying slowly (~2 seconds) so that the relative dynamic range is preserved.
                # To make the visualizer highly adaptive across all music styles (metal, pop, vocal, electro),
                # we want plenty of energetic flashing no matter what mode or volume we are on, while also
                # gracefully dimming down and calming the general visuals when the song gets slow and calm.
                #
                # 1) Dynamic Ceiling Follower:
                #    We track the local raw RMS volume peak with an instant attack and moderate decay model.
                if not hasattr(self, '_agc_ceiling'):
                    self._agc_ceiling = 0.05
                if not hasattr(self, '_volume_history_for_bpm'):
                    # A longer rolling window (~6 seconds) to detect if the overall song is calm or high-energy
                    self._volume_history_for_bpm = deque(maxlen=300)
                if not hasattr(self, '_beat_timestamps'):
                    self._beat_timestamps = deque(maxlen=20)

                target_vol = max(rms_intensity, self.low_threshold)
                self._volume_history_for_bpm.append(target_vol)

                if target_vol > self._agc_ceiling:
                    # Instant tracking of loud transient peaks
                    self._agc_ceiling = target_vol
                else:
                    # Slow decay (decay factor 0.995) to hold reference ceiling high during normal playback
                    self._agc_ceiling = max(0.005, self._agc_ceiling * 0.995 + target_vol * 0.005)

                dynamic_ceiling = self._agc_ceiling
                
                # Clamp ceiling to avoid extreme amplification of mic hum
                min_ceiling = max(0.005, self.low_threshold * 1.5)
                dynamic_ceiling = max(min_ceiling, dynamic_ceiling)

                # Calculate specific individual band ceilings so that loud frequency sections
                # don't pin all bands to 100%! Each band scales on its own dynamic range.
                if not hasattr(self, '_band_ceilings'):
                    self._band_ceilings = {band: 0.05 for band in FREQUENCY_BANDS.keys()}

                for band_name, energy in band_energies_raw.items():
                    if energy > self._band_ceilings[band_name]:
                        self._band_ceilings[band_name] = energy
                    else:
                        # Decay band ceilings slowly (decay factor 0.994) to hold individual band headroom high
                        self._band_ceilings[band_name] = max(0.005, self._band_ceilings[band_name] * 0.994 + energy * 0.006)

                # Clamp band ceilings to avoid extreme amplification of background noise
                band_attenuations = {}
                for band_name, b_ceiling in self._band_ceilings.items():
                    b_min_ceiling = max(0.005, self.low_threshold * 1.5)
                    b_range = max(0.002, max(b_ceiling, b_min_ceiling) - self.low_threshold)
                    band_attenuations[band_name] = 1.0 / b_range
                
                # Determine how active/quiet the music is based on recent rolling data vs long-term values.
                # 2) "Slow & Calm" Track Detection:
                #    If the average volume level is very low relative to its noise floor, or if there's very low energy,
                #    or if the rate of beats (BPM equivalent) is very sparse, we decrease the gain scaling.
                avg_recent_vol = float(np.mean(self._volume_history_for_bpm)) if len(self._volume_history_for_bpm) > 0 else target_vol
                
                # Calculate active range & base attenuation
                active_range = max(0.002, dynamic_ceiling - self.low_threshold)
                attenuation = 1.0 / active_range

                # 3) Flash-vibrancy Adaptation Factor ("Vibe Scalar"):
                #    We want the general visual rendering output to feel highly lively (plenty of movement).
                #    If we are playing high-intensity music, we boost the scaling to make it flash intensely.
                #    If the song transitions to a slow/calm segment, we dynamically dial down the scale multiplier.
                # Let's count beats in the last 5 seconds to estimate energy.
                current_time = time.time()
                recent_beats = [t for t in self._beat_timestamps if current_time - t < 5.0]
                beat_count_5s = len(recent_beats)

                vibe_scalar = 1.0
                
                # If there are very few beats/pulses detected or the average long-term volume is very low,
                # it means the song is slow, quiet, or calm. We dim the scalar (down to 0.4x) so the LEDs calm down.
                if len(self._volume_history_for_bpm) >= 100:
                    vol_std = float(np.std(self._volume_history_for_bpm))
                    # Very quiet transitions/ambient tracks have low variance and small averages
                    if avg_recent_vol < (self.low_threshold * 1.8) or vol_std < 0.002:
                        vibe_scalar = 0.45  # Quiet/Ambient: dim down to smooth glowing visuals
                    elif beat_count_5s < 3:
                        vibe_scalar = 0.65  # Slow/Chill: mellow/controlled movement
                    elif beat_count_5s >= 8:
                        vibe_scalar = 1.25  # High-energy / Drops: super flashy, maximum activity!

                # Apply vibe_scalar to final attenuation multiplier
                scaled_intensity = self.intensity * vibe_scalar

                # Dynamic Style Adaptation:
                # If a song is heavily vocal/high-end and lacks bass, we self-compensate the band ratios
                # Calculate energy sums for Bass versus High sections
                bass_side = band_energies_raw['sub_bass'] + band_energies_raw['bass']
                mids_high_side = (band_energies_raw['low_mids'] + band_energies_raw['mids'] + 
                                  band_energies_raw['high_mids'] + band_energies_raw['highs'] + 
                                  band_energies_raw['presence'])
                
                # Track rolling ratio history of Bass to Highs to adapt style changes
                if not hasattr(self, '_style_ratio_history'):
                    self._style_ratio_history = deque(maxlen=60) # ~1.5 sec lookback
                
                total_energy = bass_side + mids_high_side
                if total_energy > 0.005:
                    current_ratio = bass_side / total_energy
                    self._style_ratio_history.append(current_ratio)
                
                # If average bass energy is very low (< 12% of total spectral power),
                # we are listening to vocal, ambient, high-end synth, or quiet transitions.
                # In that case, we dynamically switch the beat detection to also trigger
                # on mid/high transient frequency energy spikes! This ensures the face still
                # flashes and pulses dynamically even when there's no boom-boom bass!
                is_bass_heavy_style = True
                if len(self._style_ratio_history) > 5:
                    avg_bass_pct = float(np.mean(self._style_ratio_history))
                    if avg_bass_pct < 0.12:
                        is_bass_heavy_style = False
                
                # Track rolling bass energy (or treble energy if bass is absent) for beat detection
                if is_bass_heavy_style:
                    beat_energy_source = band_energies_raw['bass'] + band_energies_raw['sub_bass']
                else:
                    # Target voice, snare, high synths, and presence crispness to fuel flash triggers
                    beat_energy_source = band_energies_raw['mids'] + band_energies_raw['high_mids'] + band_energies_raw['low_mids']
                
                self.bass_history.append(beat_energy_source)
                
                # Apply noise-gate cutoff, scale, and dynamic attenuation to individual bands
                # We multiply the normalized 0.0-1.0 signal by scaled_intensity to let the user scale it up/down,
                # while applying the vibe_scalar to automatically adapt to slow/quiet blocks or boost on heavy peaks!
                # Note: We now utilize independent dynamic band_attenuations ceilings to prevent single-frequency pinning!
                band_energies = {}
                for band_name, energy in band_energies_raw.items():
                    b_attenuation = band_attenuations[band_name]
                    raw_val = self.process_value(energy, self.low_threshold, 1.0) * b_attenuation * scaled_intensity
                    normalized = max(0.0, min(1.0, raw_val))
                    band_energies[band_name] = round(normalized, 3)
                
                # Apply cutoff, scale, and dynamic attenuation to overall intensity
                raw_intensity = self.process_value(rms_intensity, self.low_threshold, 1.0) * attenuation * scaled_intensity
                processed_intensity = max(0.0, min(1.0, raw_intensity))
                
                # Detect beats (relative transient spike in chosen energy source)
                is_beat = self.detect_beat(beat_energy_source)
                if is_beat:
                    self._beat_timestamps.append(current_time)
                
                # Throttle publishing or keep it paced
                current_time = time.time()
                if current_time - self.last_publish_time < self.publish_interval:
                    continue
                self.last_publish_time = current_time
                
                # Prepare data payload (without music style system)
                data = {
                    'timestamp': float(current_time),
                    'intensity': round(processed_intensity, 3),
                    'bands': band_energies,
                    'beat': bool(is_beat)
                }
                
                # Publish to MQTT
                if self.mqtt_connected:
                    self.mqtt_client.publish(self.mqtt_topic, json.dumps(data))
                
            except KeyboardInterrupt:
                print("\nShutting down...")
                break
            except Exception as e:
                print(f"Error processing audio in main loop: {e}")
                time.sleep(0.1)
                
    def cleanup(self):
        """Clean up resources"""
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception as e:
                print(f"Error closing stream: {e}")
        try:
            self.mqtt_client.loop_stop()
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description="Audio Visualizer sounddevice Listener")
    
    parser.add_argument("--device", type=int, default=None, help="Input device index")
    parser.add_argument("--low-threshold", type=float, default=0.02, help="Noise floor cutoff threshold")
    parser.add_argument("--intensity", type=float, default=2.0, help="Volume gain multiplier")
    parser.add_argument("--mqtt-host", type=str, default="localhost", help="MQTT broker host")
    parser.add_argument("--mqtt-port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--mqtt-topic", type=str, default="protogen/audio-visualizer/data", help="MQTT topic to publish data")
    parser.add_argument("--mqtt-config-topic", type=str, default="protogen/audio-visualizer/config", help="MQTT topic to listen for configs")
    parser.add_argument("--list-devices", action="store_true", help="List all available audio input devices and exit")
    
    # Keep compatibility with --sensitivity as a fallback
    parser.add_argument("--sensitivity", type=float, default=None, help="Deprecated sensitivity multiplier")
    
    args = parser.parse_args()
    
    if args.list_devices:
        try:
            devices = sd.query_devices()
            for i, dev in enumerate(devices):
                if dev['max_input_channels'] > 0:
                    print(f"Device {i}: {dev['name']}")
                    print(f"  Sample Rate: {int(dev['default_samplerate'])} Hz")
                    print(f"  Input Channels: {dev['max_input_channels']}")
        except Exception as e:
            print(f"Error listing devices: {e}")
            sys.exit(1)
        sys.exit(0)
        
    final_intensity = args.intensity
    if args.sensitivity is not None:
        final_intensity = args.sensitivity  # backwards-compatible mapping
        
    visualizer = AudioVisualizer(
        device_index=args.device,
        low_threshold=args.low_threshold,
        intensity=final_intensity,
        mqtt_host=args.mqtt_host,
        mqtt_port=args.mqtt_port,
        mqtt_topic=args.mqtt_topic,
        mqtt_config_topic=args.mqtt_config_topic
    )
    
    visualizer.connect_mqtt()
    visualizer.start_audio_stream()
    
    try:
        visualizer.process_audio()
    except KeyboardInterrupt:
        pass
    finally:
        visualizer.cleanup()


if __name__ == "__main__":
    main()
