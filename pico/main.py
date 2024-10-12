import sys
import select
import machine
import neopixel
import time
import sh1106

# ========== Config ==========
PROTO_LED_PIN = 5
PROTO_LED_COUNT = 24 * 2
        

# ========== Main ==========
np = neopixel.NeoPixel(machine.Pin(PROTO_LED_PIN), PROTO_LED_COUNT)
for i in range(PROTO_LED_COUNT):
    np[i] = (0, 0, 0)
np.write()
rtc = machine.RTC()

buffer = ""
def non_blocking_input():
    global buffer
    # Check if there's input waiting
    if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
        while True:
            char = sys.stdin.read(1)  # Read one character at a time
            if char == '\n':  # Check for the Enter key
                input_str = buffer  # Capture the full input string
                buffer = ""  # Reset the buffer for the next input
                return input_str
            else:
                buffer += char  # Add the character to the buffer
    return None

def format_rtc_datetime(rtc_datetime):
    year, month, day, _, hour, minute, second, _ = rtc_datetime
    return f"{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}"

def handle_input(input):
    if input.startswith('RGB:'):
        color_values = input[4:].strip()  # Get everything after 'RGB:'
        # Split the string into a list of integers
        rgb_list = list(map(int, color_values.split(',')))

        # Validate the length of the list
        if len(rgb_list) % 1 != 0:
            print("Error: RGB values must be a valid list of integers.")
            return  # Exit if the length is invalid

        # Clear the NeoPixel buffer
        for i in range(PROTO_LED_COUNT):
            np[i] = (0, 0, 0)  # Set all pixels to off
        
        # Process color values
        for i in range(len(rgb_list)):  # Process each integer color
            if i < PROTO_LED_COUNT:  # Ensure we do not exceed the LED count
                color = rgb_list[i]
                r = (color >> 16) & 0xFF  # Extract red
                g = (color >> 8) & 0xFF   # Extract green
                b = color & 0xFF          # Extract blue
                
                # Update NeoPixel with the received color
                np[i] = (r, g, b)

        np.write()  # Update the NeoPixels once after processing all colors
        print("OK:RGB") 
    if input.startswith('TIME:'):
        unix_timestamp = int(input[5:].strip())
        time_tuple = time.localtime(unix_timestamp)
        rtc.datetime((time_tuple[0], time_tuple[1], time_tuple[2], 0, time_tuple[3], time_tuple[4], time_tuple[5], 0))
        print("OK:TIME:" + format_rtc_datetime(rtc.datetime()))
    if input == 'REBOOT':
        machine.reset()

while True:
    user_input = non_blocking_input()
    
    if user_input:
        handle_input(user_input)
