from gpiozero import MCP3008
from time import sleep

joystick_x = MCP3008(0)
joystick_y = MCP3008(1)

while True:
  print("x: " + str(round(joystick_x.value, 4)) + " y: " + str(round(joystick_y.value, 4)))
  sleep(0.1)