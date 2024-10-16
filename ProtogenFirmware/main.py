import sys
import select
import machine
import neopixel
import time
import sh1106
import font
import utime

# ========== Config ==========
PROTO_LED_PIN = 6
PROTO_LED_COUNT = 24 * 2

# ========== Boop sensor ==========
PROTO_BOOP_SENSOR_PIN = 7
PROTO_BOOP_SENSOR_INVERT = True # True if a the sensor pulls down on detection

# ========== OLED ==========
PROTO_OLED_SDA = 4
PROTO_OLED_SCL = 5
PROTO_OLED_WIDTH  = 128
PROTO_OLED_HEIGHT = 64

# ========== Main ==========
print("LOG:Init neopixel")
np = neopixel.NeoPixel(machine.Pin(PROTO_LED_PIN), PROTO_LED_COUNT)
for i in range(PROTO_LED_COUNT):
    np[i] = (0, 0, 0) # type: ignore
np.write()

print("LOG:Init boop sensor")
last_boop_state = False
boop_pin = machine.Pin(PROTO_BOOP_SENSOR_PIN, machine.Pin.IN)

print("LOG:Init display")
display_i2c = machine.I2C(0, scl=machine.Pin(PROTO_OLED_SCL), sda=machine.Pin(PROTO_OLED_SDA), freq=400000)
display = sh1106.SH1106_I2C(128, 64, display_i2c, machine.Pin(2), 0x3c)
display.sleep(False)
display_changed = False

text_array = ["", "", "", "", "", ""] # Define the available line count here

buffer = ""
def non_blocking_input():
    global buffer
    # Check if there's input waiting
    if sys.stdin in select.select([sys.stdin], [], [], 0)[0]: # type: ignore
        while True:
            char = sys.stdin.read(1)  # Read one character at a time
            if char == '\n':  # Check for the Enter key
                input_str = buffer  # Capture the full input string
                buffer = ""  # Reset the buffer for the next input
                return input_str
            else:
                buffer += char  # Add the character to the buffer
    return None

def handle_input(input):
    global display_changed
    try:
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
                np[i] = (0, 0, 0)  # type: ignore # Set all pixels to off
            
            # Process color values
            for i in range(len(rgb_list)):  # Process each integer color
                if i < PROTO_LED_COUNT:  # Ensure we do not exceed the LED count
                    color = rgb_list[i]
                    r = (color >> 16) & 0xFF  # Extract red
                    g = (color >> 8) & 0xFF   # Extract green
                    b = color & 0xFF          # Extract blue
                    
                    # Update NeoPixel with the received color
                    np[i] = (r, g, b) # type: ignore

            np.write()  # Update the NeoPixels once after processing all colors
            print("OK:RGB") 
        elif input == 'REBOOT':
            print("OK:RESET")
            machine.reset()
        elif input.startswith('TEXT:'):
            lines = input[5:].strip().split("|")
            if(len(lines) > len(text_array)):
                print("ERR:Input text exceeds the available lien count of " + str(len(text_array)))
            else:
                for index, value in enumerate(lines):
                    text_array[index] = value
                    display_changed = True
                print("OK:TEXT")
    except Exception as e:
        print(f"ERR:{e}")

print("LOG:Loading font")
last_time = utime.ticks_ms()
with font.FontRenderer(PROTO_OLED_WIDTH, PROTO_OLED_HEIGHT, display.pixel) as fr:
    print("LOG:Start main loop")
    while True:
        user_input = non_blocking_input()
        
        if user_input:
            handle_input(user_input)
        
        boop_state = bool(boop_pin.value() ^ PROTO_BOOP_SENSOR_INVERT)
        if boop_state is not last_boop_state:
            last_boop_state = boop_state
            print("BOOP:" + str(boop_state))
        
        if display_changed:
            display_changed = False
            display.fill(0)
            text_start = 1
            for index, value in enumerate(text_array):
                fr.text(value, 0, text_start + (12 * index), 255)
            display.show()

