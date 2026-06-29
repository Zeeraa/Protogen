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
import argparse

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

# Steam Controller button name mapping
STEAM_CONTROLLER_BUTTON_NAMES = {
    2: "HOME",
    3: "A",
    4: "B",
    5: "X",
    6: "Y",
    7: "LB",
    8: "RB",
    11: "SELECT",
    12: "START",
    14: "LS",
    15: "RS",
}

# Steam Controller axis name mapping
STEAM_CONTROLLER_AXIS_NAMES = {
    0: "LEFT_X",
    1: "LEFT_Y",
    2: "LT",
    3: "RIGHT_X",
    4: "RIGHT_Y",
    5: "RT",
    6: "DPAD_X",
    7: "DPAD_Y",
}

STEAM_CONTROLLER_IMMEDIATE_AXES = {"LT", "RT"}


def load_config(path: str) -> dict:
    """Load a JSON config file and return the parsed options."""
    with open(path, "r") as f:
        raw = json.load(f)
    return {
        "steam_controller": bool(raw.get("steam_controller", False)),
    }


class GamepadListener:
    def __init__(self, debug=False, steam_controller=False):
        self._mqtt_client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id="gamepad_listener",
        )
        self._running = True
        self._gamepad = None
        self._throttled_dirty = False
        self._immediate_dirty = False
        self._last_axis_send = 0.0
        self._debug = debug
        self._debug_last_axes: dict = {}

        if steam_controller:
            print("Using Steam Controller mapping", flush=True)
            self._button_names = STEAM_CONTROLLER_BUTTON_NAMES
            self._axis_names = STEAM_CONTROLLER_AXIS_NAMES
            self._immediate_axes = STEAM_CONTROLLER_IMMEDIATE_AXES
        else:
            self._button_names = BUTTON_NAMES
            self._axis_names = AXIS_NAMES
            self._immediate_axes = IMMEDIATE_AXES

        # Reverse map: axis name -> raw id (for debug output)
        self._axis_names_inv = {v: k for k, v in self._axis_names.items()}

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

    def _publish_button(self, button_id: int, name: str, pressed: bool):
        if self._debug:
            print(f"Button id={button_id} ({name}): {'pressed' if pressed else 'released'}", flush=True)
        payload = json.dumps({"code": name, "name": name, "pressed": pressed})
        self._mqtt_client.publish(TOPIC_BUTTON, payload, qos=1)

    def _remap_axis(self, name: str, value: float) -> float:
        if name in self._immediate_axes:
            return (value + 1.0) / 2.0
        return value

    def _publish_axes(self, axes: dict):
        payload = json.dumps({"axes": axes})
        if self._debug:
            changed = {
                name: value for name, value in axes.items()
                if abs(value - self._debug_last_axes.get(name, 0.0)) >= 0.05
            }
            if changed:
                # Print as "id=N (NAME): value"
                parts = [f"id={self._axis_names_inv.get(n, '?')} ({n}): {v}" for n, v in changed.items()]
                print(f"Axes: {', '.join(parts)}", flush=True)
                self._debug_last_axes.update(changed)
        self._mqtt_client.publish(TOPIC_AXES, payload, qos=0)

    def _on_button_pressed(self, button_id):
        """Closure factory for button pressed events."""
        name = self._button_names.get(button_id, str(button_id))
        def handler():
            self._publish_button(button_id, name, True)
        return handler

    def _on_button_released(self, button_id):
        """Closure factory for button released events."""
        name = self._button_names.get(button_id, str(button_id))
        def handler():
            self._publish_button(button_id, name, False)
        return handler

    def _on_axis_moved(self, axis_id):
        """Closure factory for axis moved events."""
        name = self._axis_names.get(axis_id, str(axis_id))
        is_immediate = name in self._immediate_axes
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
                gamepad = GamepadLib.Gamepad(JOYSTICK_NUMBER)  # noqa: keep module-level constant for device index
                self._gamepad = gamepad
                name = getattr(gamepad, "fullName", "Generic")

                gamepad.startBackgroundUpdates(waitForReady=True)

                # Register handlers by raw index after init events have populated the maps
                button_indices = list(gamepad.pressedMap.keys())
                axis_indices = list(gamepad.axisMap.keys())

                if self._debug:
                    print(f"Detected gamepad: {name}", flush=True)
                    print(f"Available buttons: {button_indices}", flush=True)
                    for btn_idx in button_indices:
                        btn_name = self._button_names.get(btn_idx, f"UNKNOWN_{btn_idx}")
                        print(f"  Button {btn_idx}: {btn_name}", flush=True)
                    print(f"Available axes: {axis_indices}", flush=True)
                    for axis_idx in axis_indices:
                        axis_name = self._axis_names.get(axis_idx, f"UNKNOWN_{axis_idx}")
                        print(f"  Axis {axis_idx}: {axis_name}", flush=True)

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
                    name = self._axis_names.get(axis_idx, str(axis_idx))
                    is_imm = name in self._immediate_axes
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
                    name = self._axis_names.get(axis_idx, str(axis_idx))
                    axes[name] = round(self._remap_axis(name, gamepad.axisMap[axis_idx]), 4)
                except (KeyError, ValueError):
                    pass
            if axes:
                self._publish_axes(axes)
            self._last_axis_send = now

        # Small sleep to avoid busy-waiting
        time.sleep(0.01)


def main():
    parser = argparse.ArgumentParser(description="Gamepad Listener Service for Protogen")
    parser.add_argument("--debug", action="store_true", help="Enable debug output for buttons and axes")
    parser.add_argument("--config", metavar="PATH", help="Path to a JSON config file")
    args = parser.parse_args()

    steam_controller = False
    if args.config:
        try:
            cfg = load_config(args.config)
            steam_controller = cfg["steam_controller"]
        except FileNotFoundError:
            print(f"Config file at {args.config} not found, continuing with defaults", flush=True)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error loading config: {e}", flush=True)
            sys.exit(1)

    print("Gamepad Listener starting...", flush=True)
    if args.debug:
        print("Debug mode enabled", flush=True)
    listener = GamepadListener(debug=args.debug, steam_controller=steam_controller)
    listener.start()


if __name__ == "__main__":
    main()
