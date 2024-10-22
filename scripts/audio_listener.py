import sounddevice as sd
import numpy as np
import argparse
import redis
from scipy import signal

parser = argparse.ArgumentParser(description="Protogen audio visualiser script")
parser.add_argument("--sample-rate", type=int, required=True, help="Number of times per second to log audio levels")
parser.add_argument("--redis-host", type=str, required=True, help="Redis server hostname")
parser.add_argument("--redis-port", type=int, required=True, help="Redis server port")
parser.add_argument("--cutoff-freq", type=int, default=500)
args = parser.parse_args()

print("Setting up redis connection")
r = redis.Redis(host=args.redis_host, port=args.redis_port, db=0)

redis_channel = "audio_channel"

desired_calls_per_second = args.sample_rate
samplerate = 44100
blocksize = samplerate // desired_calls_per_second

def low_pass_filter(data, samplerate, cutoff_freq=500):
    nyquist = 0.5 * samplerate
    normal_cutoff = cutoff_freq / nyquist
    b, a = signal.butter(1, normal_cutoff, btype='low', analog=False)
    return signal.lfilter(b, a, data)

def log_sound(indata, frames, time, status):
    filtered_data = low_pass_filter(indata, 44100, cutoff_freq=500)
    volume_norm = np.linalg.norm(filtered_data)
    r.publish(redis_channel, float(volume_norm))
    # print(volume_norm)

print("Starting main loop")
with sd.InputStream(callback=log_sound, samplerate=samplerate, blocksize=blocksize):
    while True:
        sd.sleep(1000)
