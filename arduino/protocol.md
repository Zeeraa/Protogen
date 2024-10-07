# Server -> Arduino
### Time sync
`TIME:<unix_timestamp>`
Sync the time and RTC

### RGB
`RGB:<values>`
Sends data to the rgb leds. Values are in hex format with no separator, changing 3 leds to red would be `FF0000FF0000FF0000`

# Arduino -> Server
### Ok
`OK:<Message>`
Success response

### Error
`ERR:<Message>`
Error response

### Boop
`BOOP:<State>`
Boop state changed. State is either 1 or 0