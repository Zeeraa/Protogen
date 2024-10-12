# Protogen Pico Software
This folder contains the software running on the raspberry pi pico that handles sensors, hud and led effects

## Commands
### Server -> Pico
* `TIME:<Unix timestamp>` Set rtc clock
* `RGB:<Value>,<Value>,<Value>...` Set the color of the leds. The color for each led is provided as a single number
* `REBOOT` Resets the pico
### Pico -> Server
* `OK:<Message>` Success response, might also be in the following format `OK:<Message>:<Data>`
* `ERROR:<Message>` Error response