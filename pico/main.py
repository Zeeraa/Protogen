import sys
import machine

# ========== Config ==========
PROTO_LED_PIN = 6
PROTO_LED_COUNT = 24 + 24 + 13 + 13

# Enable or disable features here depending on your hardware config
ENABLE_RGB = True
ENABLE_HUD = True
ENABLE_BOOP_SENSOR = True

# ========== Boop sensor ==========
PROTO_BOOP_SENSOR_PIN = 7
PROTO_BOOP_SENSOR_INVERT = True  # True if the sensor pulls down on detection

# ========== OLED ==========
PROTO_OLED_SDA = 4
PROTO_OLED_SCL = 5
PROTO_OLED_WIDTH = 128
PROTO_OLED_HEIGHT = 64

# ========== Main ==========
np = None
if ENABLE_RGB:
    import neopixel
    print("LOG:Init neopixel")
    np = neopixel.NeoPixel(machine.Pin(PROTO_LED_PIN), PROTO_LED_COUNT)
    for i in range(PROTO_LED_COUNT):
        np[i] = (0, 0, 0)  # type: ignore
    np.write()
else:
    print("LOG:Skipping neopixel (disabled)")

debug_clock_pin = machine.Pin(16, machine.Pin.OUT)

boop_pin = None
last_boop_state = False
if ENABLE_BOOP_SENSOR:
    print("LOG:Init boop sensor")
    boop_pin = machine.Pin(PROTO_BOOP_SENSOR_PIN, machine.Pin.IN)
else:
    print("LOG:Skipping boop sensor (disabled)")

display = None
display_changed = False
text_array = ["", "", "", "", "", ""]  # Define the available line count here

if ENABLE_HUD:
    import sh1106
    import font
    print("LOG:Init display")
    display_i2c = machine.I2C(0, scl=machine.Pin(PROTO_OLED_SCL), sda=machine.Pin(PROTO_OLED_SDA), freq=400000)
    display = sh1106.SH1106_I2C(128, 64, display_i2c, machine.Pin(2), 0x3c)
    display.sleep(False)
    display_changed = True

    # Startup text
    text_array[0] = "Protogen V1.0"
    text_array[1] = "Waiting for connection"
else:
    print("LOG:Skipping display (disabled)")

machine.Pin.board.LED.value(1)

def handle_input(input):
    global display_changed
    try:
        if input.startswith('RGB:'):
            if not ENABLE_RGB or np is None:
                print("ERR:RGB is disabled")
                return
            rgb_list = list(map(int, input[4:].strip().split(',')))
            for i in range(len(rgb_list)):
                if i < PROTO_LED_COUNT:  # Ensure we do not exceed the LED count
                    color = rgb_list[i]
                    # Update NeoPixel with the received color
                    np[i] = ((color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF)  # type: ignore
            np.write()  # Update the NeoPixels once after processing all colors
        elif input == 'REBOOT':
            print("OK:RESET")
            machine.reset()
        elif input.startswith('TEXT:'):
            if not ENABLE_HUD or display is None:
                print("ERR:HUD is disabled")
                return
            lines = input[5:].strip().split("|")
            if len(lines) > len(text_array):
                print("ERR:Input text exceeds the available line count of " + str(len(text_array)))
            else:
                for index, value in enumerate(lines):
                    text_array[index] = value
                    display_changed = True
    except Exception as e:
        print(f"ERR:{e}")

# Function for blocking input until newline
def blocking_input():
    input_str = sys.stdin.readline().strip()  # This will block until a newline is received
    return input_str

# Function for handling boop sensor state
def check_boop_sensor(timer):
    global last_boop_state
    boop_state = bool(boop_pin.value() ^ PROTO_BOOP_SENSOR_INVERT)
    if boop_state != last_boop_state:
        last_boop_state = boop_state
        print("BOOP:" + str(boop_state))

# Setup a timer for boop sensor checking every 100ms (adjust as needed)
if ENABLE_BOOP_SENSOR and boop_pin is not None:
    boop_timer = machine.Timer(-1)
    boop_timer.init(period=100, mode=machine.Timer.PERIODIC, callback=check_boop_sensor)

if ENABLE_HUD and display is not None:
    print("LOG:Loading font")
    fr = font.FontRenderer(PROTO_OLED_WIDTH, PROTO_OLED_HEIGHT, display.pixel)
    fr.__enter__()

print("LOG:Start main loop")
while True:
    debug_clock_pin.value(not debug_clock_pin.value())

    if ENABLE_HUD and display is not None and display_changed:
        display_changed = False
        display.fill(0)
        text_start = 1
        for index, value in enumerate(text_array):
            fr.text(value, 0, text_start + (12 * index), 255)
        display.show()
    
    # Block until input is received
    user_input = blocking_input()
    if user_input:
        handle_input(user_input)