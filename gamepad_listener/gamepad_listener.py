#!/usr/bin/env python3
"""
Gamepad Listener Service for Protogen.

Listens for the primary gamepad via piborg/Gamepad library and publishes
state changes over MQTT to be consumed by the Node.js backend GamepadManager.

Topics:
  protogen/gamepad/status  - JSON: {"connected": bool, "name": str}
  protogen/gamepad/button  - JSON: {"code": str, "name": str, "pressed": bool}
  protogen/gamepad/axes    - JSON: {"axes": {name: value, ...}}
"""

import json
import signal
import sys
import time
import os

# Add the Gamepad submodule to the path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "Gamepad"))
import Gamepad as GamepadLib

import paho.mqtt.client as mqtt

MQTT_HOST = "127.0.0.1"
MQTT_PORT = 1883

TOPIC_STATUS = "protogen/gamepad/status"
TOPIC_BUTTON = "protogen/gamepad/button"
TOPIC_AXES = "protogen/gamepad/axes"

AXIS_SEND_INTERVAL = 0.05  # 50ms throttle for joystick axes only
JOYSTICK_NUMBER = 0

# Axes that should be sent immediately (no throttle)
IMMEDIATE_AXES = {"LT", "RT"}
# Axes that are throttled
THROTTLED_AXES = {"LEFT_X", "LEFT_Y", "RIGHT_X", "RIGHT_Y", "DPAD_X", "DPAD_Y"}

# Xbox-style button name mapping (xpadneo / Xbox ONE layout)
BUTTON_NAMES = {
    0: "A",
    1: "B",
    2: "Y",
    3: "X",
    4: "LB",
    5: "RB",
    6: "LT",
    7: "RT",
    8: "SELECT",
    9: "START",
    10: "HOME",
    11: "LS",
    12: "RS",
}

# Xbox-style axis name mapping
AXIS_NAMES = {
    0: "LEFT_X",
    1: "LEFT_Y",
    2: "LT",
    3: "RIGHT_X",
    4: "RIGHT_Y",
    5: "RT",
    6: "DPAD_X",
    7: "DPAD_Y",
}


class GamepadListener:
    def __init__(self):
        self._mqtt_client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id="gamepad_listener",
        )
        self._running = True
        self._gamepad = None
        self._throttled_dirty = False
        self._immediate_dirty = False
        self._last_axis_send = 0.0

        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        print("Shutdown signal received", flush=True)
        self._running = False

    def start(self):
        self._mqtt_client.connect(MQTT_HOST, MQTT_PORT)
        self._mqtt_client.loop_start()
        print("Connected to MQTT broker", flush=True)

        # Publish initial disconnected state
        self._publish_status(False, "")

        try:
            self._main_loop()
        finally:
            self._cleanup()

    def _cleanup(self):
        if self._gamepad is not None:
            name = getattr(self._gamepad, "fullName", "Unknown")
            self._publish_status(False, name)
            try:
                self._gamepad.disconnect()
            except Exception:
                pass
            self._gamepad = None
        self._mqtt_client.loop_stop()
        self._mqtt_client.disconnect()

    def _publish_status(self, connected: bool, name: str):
        payload = json.dumps({"connected": connected, "name": name})
        self._mqtt_client.publish(TOPIC_STATUS, payload, qos=1, retain=True)
        print(f"Gamepad {'connected' if connected else 'disconnected'}: {name}", flush=True)

    def _publish_button(self, name: str, pressed: bool):
        payload = json.dumps({"code": name, "name": name, "pressed": pressed})
        self._mqtt_client.publish(TOPIC_BUTTON, payload, qos=1)

    @staticmethod
    def _remap_axis(name: str, value: float) -> float:
        if name in IMMEDIATE_AXES:
            return (value + 1.0) / 2.0
        return value

    def _publish_axes(self, axes: dict):
        payload = json.dumps({"axes": axes})
        self._mqtt_client.publish(TOPIC_AXES, payload, qos=0)

    def _on_button_pressed(self, button_id):
        """Closure factory for button pressed events."""
        name = BUTTON_NAMES.get(button_id, str(button_id))
        def handler():
            self._publish_button(name, True)
        return handler

    def _on_button_released(self, button_id):
        """Closure factory for button released events."""
        name = BUTTON_NAMES.get(button_id, str(button_id))
        def handler():
            self._publish_button(name, False)
        return handler

    def _on_axis_moved(self, axis_id):
        """Closure factory for axis moved events."""
        name = AXIS_NAMES.get(axis_id, str(axis_id))
        is_immediate = name in IMMEDIATE_AXES
        def handler(value):
            if is_immediate:
                self._immediate_dirty = True
            else:
                self._throttled_dirty = True
        return handler

    def _main_loop(self):
        while self._running:
            if self._gamepad is None:
                self._try_connect()
            else:
                self._monitor_gamepad()

    def _try_connect(self):
        """Poll for a gamepad device."""
        available = GamepadLib.available(JOYSTICK_NUMBER)
        if available:
            try:
                gamepad = GamepadLib.Gamepad(JOYSTICK_NUMBER)
                self._gamepad = gamepad
                name = getattr(gamepad, "fullName", "Generic")

                gamepad.startBackgroundUpdates(waitForReady=True)

                # Register handlers by raw index after init events have populated the maps
                button_indices = list(gamepad.pressedMap.keys())
                axis_indices = list(gamepad.axisMap.keys())

                for btn_idx in button_indices:
                    gamepad.addButtonPressedHandler(btn_idx, self._on_button_pressed(btn_idx))
                    gamepad.addButtonReleasedHandler(btn_idx, self._on_button_released(btn_idx))

                for axis_idx in axis_indices:
                    gamepad.addAxisMovedHandler(axis_idx, self._on_axis_moved(axis_idx))

                self._publish_status(True, name)
            except Exception as e:
                print(f"Failed to connect to gamepad: {e}", flush=True)
                self._gamepad = None
                time.sleep(1)
        else:
            time.sleep(1)

    def _monitor_gamepad(self):
        """Monitor connected gamepad, send throttled axis data, detect disconnect."""
        gamepad = self._gamepad

        if not gamepad.isConnected():
            name = getattr(gamepad, "fullName", "Unknown")
            self._publish_status(False, name)
            try:
                gamepad.disconnect()
            except Exception:
                pass
            self._gamepad = None
            self._throttled_dirty = False
            self._immediate_dirty = False
            return

        now = time.monotonic()
        periodic = now - self._last_axis_send >= AXIS_SEND_INTERVAL
        send_throttled = self._throttled_dirty and periodic
        send_immediate = self._immediate_dirty

        if send_throttled or send_immediate:
            axes = {}
            for axis_idx in list(gamepad.axisMap.keys()):
                try:
                    name = AXIS_NAMES.get(axis_idx, str(axis_idx))
                    is_imm = name in IMMEDIATE_AXES
                    if (is_imm and send_immediate) or (not is_imm and send_throttled):
                        axes[name] = round(self._remap_axis(name, gamepad.axisMap[axis_idx]), 4)
                except (KeyError, ValueError):
                    pass
            if axes:
                self._publish_axes(axes)
            if send_immediate:
                self._immediate_dirty = False
            if send_throttled:
                self._throttled_dirty = False
                self._last_axis_send = now

        # Full state broadcast every 50ms regardless of dirty flags
        if periodic and not send_throttled:
            axes = {}
            for axis_idx in list(gamepad.axisMap.keys()):
                try:
                    name = AXIS_NAMES.get(axis_idx, str(axis_idx))
                    axes[name] = round(self._remap_axis(name, gamepad.axisMap[axis_idx]), 4)
                except (KeyError, ValueError):
                    pass
            if axes:
                self._publish_axes(axes)
            self._last_axis_send = now

        # Small sleep to avoid busy-waiting
        time.sleep(0.01)


def main():
    print("Gamepad Listener starting...", flush=True)
    listener = GamepadListener()
    listener.start()


if __name__ == "__main__":
    main()
