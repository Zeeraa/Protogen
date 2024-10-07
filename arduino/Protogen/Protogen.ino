// ===== Configure Features =====
// Comment out enable for features you dont want
// General
#define TARGET_TICKRATE 10  // Target times/second for sensor readings and display updates

// Serial
#define SERIAL_BAUD_RATE 115200  // Baud rate of serial connection
#define SERIAL_TIMEOUT 1000      // Serial timeout
// OLED Hud
#define ENABLE_OLED_HUD           // Enable HUD
#define OLED_SCREEN_WIDTH 128     // OLED display width, in pixels
#define OLED_SCREEN_HEIGHT 32     // OLED display height, in pixels
#define OLED_RESET -1             // Reset pin # (or -1 if sharing Arduino reset pin)
#define OLED_SCREEN_ADDRESS 0x3C  // Address to the oled screen

// Boop sensor
#define ENABLE_BOOP_SENSOR       // Enable boop sensor
#define BOOP_SENSOR_PIN 2        // The pin of the boop sensor
#define BOOP_SENSOR_INVERT true  // Invert the state of the boop sensor

// LED
#define ENABLE_LED    // Enable LED strips
#define LED_PIN 6     // Pin of the LED strips
#define LED_COUNT 48  // LED count

// RTC
#define ENABLE_RTC  // Enable RTC clock
// ===== End of config =====

#include "RTClib.h"
#include <Wire.h>

// ===== Sensors / Modules =====
unsigned long unixTimestamp = 0;
unsigned long previousMillis = 0;
unsigned long interval = 1000 / TARGET_TICKRATE;
int programCounter = 0;
String inputString = "";
bool stringComplete = false;

// RTC
#ifdef ENABLE_RTC
RTC_DS3231 rtc;
#endif

// OLED HUD
#ifdef ENABLE_OLED_HUD
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(OLED_SCREEN_WIDTH, OLED_SCREEN_HEIGHT, &Wire, OLED_RESET);
#endif

#ifdef ENABLE_LED
#include "FastLED.h"
CRGB leds[LED_COUNT];
#endif

#ifdef ENABLE_BOOP_SENSOR
bool oldBoopState = false;
#endif

// ===== Setup =====
void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  Serial.setTimeout(SERIAL_TIMEOUT);
  inputString.reserve(2048);

  pinMode(LED_BUILTIN, OUTPUT);

  unixTimestamp = 0;
// RTC
#ifdef ENABLE_RTC
  if (!rtc.begin()) {
    Serial.println("Couldn't find RTC");
    while (true) {
      digitalWrite(LED_BUILTIN, HIGH);
      delay(1000);
      digitalWrite(LED_BUILTIN, LOW);
      delay(1000);
    }
  }

  if (rtc.lostPower()) {
    // Set RTC to the current time, change to desired date/time if needed
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  DateTime now = rtc.now();
  unixTimestamp = now.unixtime();
#endif

// LEDs
#ifdef ENABLE_LED
  // If you have other types of LEDs than neopixels change the code below
  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, LED_COUNT);
  delay(1000);
  for (int i = 0; i < LED_COUNT; i++) {
    leds[i] = CRGB::Black;
    FastLED.show();
  }
#endif

// Display
#ifdef ENABLE_OLED_HUD
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    while (true) {
      digitalWrite(LED_BUILTIN, HIGH);
      delay(1000);
      digitalWrite(LED_BUILTIN, LOW);
      delay(1000);
    }
  }

  display.display();
  delay(2000);
  display.clearDisplay();
  digitalWrite(LED_BUILTIN, LOW);
  display.display();
#endif

#ifdef ENABLE_BOOP_SENSOR
  pinMode(BOOP_SENSOR_PIN, INPUT);
#endif
}

// ===== Main loop =====
void loop() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n') {     // Check for line end
      stringComplete = true;  // Mark string as complete
    } else {
      inputString += inChar;  // Append to inputString
    }
    break;
  }

  // Handle input
  if (stringComplete) {
    if (inputString.startsWith("TIME:")) {
      unixTimestamp = inputString.substring(5).toInt();
#ifdef ENABLE_RTC
      rtc.adjust(DateTime(unixTimestamp));
#endif
      Serial.println("OK:TIME");
    } else if (inputString.startsWith("RGB:")) {
      String hexValues = inputString.substring(4);
      int index = 0;
      Serial.println(hexValues.length());
      // Ensure we have a valid hex string
      if (hexValues.length() % 6 != 0) {
        Serial.println("ERR:Invalid hex string length.");
      } else {
        // Set RGB values on the LED strip
        for (int i = 0; i < hexValues.length() / 6 && index < LED_COUNT; i++) {
          String hexColor = hexValues.substring(i * 6, (i + 1) * 6);
          long rgb = strtol(hexColor.c_str(), NULL, 16);                            // Convert hex to long
          leds[index++] = CRGB((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);  // Extract RGB
        }

        FastLED.show();
        Serial.println("OK:RGB");
      }
    }
    inputString = "";
    stringComplete = false;
  }

  updateUnixTime();
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    programCounter++;
    previousMillis = currentMillis;
#ifdef ENABLE_BOOP_SENSOR
    bool boopState = (digitalRead(BOOP_SENSOR_PIN) == HIGH) ^ BOOP_SENSOR_INVERT;
    if (boopState != oldBoopState) {
      oldBoopState = boopState;
      Serial.println("BOOP:" + String(boopState ? 1 : 0));
    }
#endif

#ifdef ENABLE_OLED_HUD
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(convertUnixTime(unixTimestamp));

// Print boop
#ifdef ENABLE_BOOP_SENSOR
    if (boopState) {
      display.print("BOOP ");
    }
#endif

    display.display();
#endif
  }
}

String convertUnixTime(unsigned long epochTime) {
  DateTime dt = DateTime(epochTime);  // Create a DateTime object from Unix time

  // Build the result string in YYYY-mm-dd HH:mm:ss format
  String result = String(dt.year()) + "-";
  if (dt.month() < 10) result += "0";
  result += String(dt.month()) + "-";
  if (dt.day() < 10) result += "0";
  result += String(dt.day()) + " ";
  if (dt.hour() < 10) result += "0";
  result += String(dt.hour()) + ":";
  if (dt.minute() < 10) result += "0";
  result += String(dt.minute()) + ":";
  if (dt.second() < 10) result += "0";
  result += String(dt.second());

  return result;
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    inputString += inChar;
    if (inChar == '\n') {
      stringComplete = true;
    }
  }
}

void updateUnixTime() {
  static unsigned long lastSecond = millis();

  // Every 1000 milliseconds, increment the Unix timestamp
  if (millis() - lastSecond >= 1000) {
    lastSecond += 1000;
    unixTimestamp++;  // Increment Unix timestamp by 1 second
  }
}