import sys
import os
import requests
import asyncio
import socketio
import aiohttp

from dotenv import load_dotenv
from gpiozero import Button, MCP3008

SOCKETIO_PATH = "/protogen-websocket.io"

# ---------- Remote class ----------
class Remote:
  def __init__(self, api_url, api_key, use_direct_connection):
    self.api_url = api_url
    self.api_key = api_key
    self.use_direct_connection = use_direct_connection
    self.websocket = None
    self.active_profile_id = -1
    
    # Joystick ADC and button
    self.joystick_x = MCP3008(0)
    self.joystick_y = MCP3008(1)
    self.joystick_button = Button(13)
    
    # Other buttons
    self.button_a = Button(5, pull_up=True)
    self.button_left = Button(4, pull_up=True)
    self.button_right = Button(6, pull_up=True)
  
  #region Profile data loading
  async def check_profiles(self):
    print("CHECK PROFILES")
  #endregion
  
  #region Start function
  async def start(self):
    if self.use_direct_connection:
      print("Direct conection enabled. Trying to find optimal interface for communication")
      optimal_url = self.find_optimal_url()
      if optimal_url is None:
        print("Could not find direct connection")
      else:
        print("Found direct connection url " + optimal_url)
        self.api_url = optimal_url
    
    await self.check_profiles()
    
    self.websocket = socketio.AsyncClient(reconnection=True, reconnection_attempts=0)
    self.websocket.on("connect", self.on_connect)
    self.websocket.on("connect_error", self.on_connect_error)
    self.websocket.on("disconnect", self.on_disconnect)
    
    sensor_task = asyncio.create_task(self.read_sensors_and_send())
    profile_update_task = asyncio.create_task(self.check_profiles_loop())
    socket_connection_task = asyncio.create_task(self.connect_to_socket())
    
    await asyncio.gather(sensor_task, profile_update_task, socket_connection_task)
  #endregion
  
  #region Websocket
  def on_connect(self):
    print("Connected to the websocket!")

  def on_connect_error(self, data):
    print("Socket connection failed:", data)

  def on_disconnect(self):
    print("Socket disconnected. Attempting to reconnect...")
  
  async def connect_to_socket(self):
    backoff = 1  # Initial wait time in seconds
    max_backoff = 30  # Maximum wait time
    while True:
      socket_url = ("wss://" + self.api_url[8:]) if self.api_url.startswith("https://") else ("ws://" + self.api_url[7:] if self.api_url.startswith("http://") else self.api_url)
      try:
        print(f"Attempting to connect to socket at {socket_url}...")
        await self.websocket.connect(
          socket_url,
          transports=["websocket"],
          socketio_path=SOCKETIO_PATH,
          headers={"authorization": "Key " + self.api_key}
        )
        await self.websocket.wait()
      except socketio.exceptions.ConnectionError:
        print(f"Socket connection failed. Retrying in {backoff} seconds...")
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, max_backoff)
  #endregion
  
  #region Session id detection
  def get_session_id(self, url, timeout = 30):
    print("Trying to get session id of " + url)
    response = requests.get(url + "/api/discovery", timeout=timeout)
    if response.status_code != 200:
      print("Failed to get session id")
      return None
    data = response.json()
    session_id = data.get("sessionId")
    print("Session id: " + str(session_id))
    return session_id
  #endregion
  
  #region Direct connection discovery
  def find_optimal_url(self):
    headers = {
      "x-api-key": self.api_key
    }
    
    print("Trying to find optimal address to api")
    print("Reading discovery data")
    response = requests.get(self.api_url + "/api/discovery/interfaces", headers=headers)
    if response.status_code != 200:
      print("Failed to read discovery data. Status: " + str(response.status_code))
      raise Exception("Discovery failed with http status " + str(response.status_code))
    
    discovery = response.json()
    session_id = discovery.get("sessionId")
    print("Session id: " + str(session_id))

    interfaces = discovery.get("interfaces")
    for interface in interfaces:
      try:
        print("Trying to contact api on ip " + interface.get("address"))
        direct_url = "http://" + interface.get("address")
        other_session_id = self.get_session_id(direct_url, timeout=3)
        if other_session_id is None:
          print("No session id found")
        elif session_id == other_session_id:
          print("Sesion id matches. Found a direct connection at " + direct_url)
          return direct_url
        else:
          print("Other url responded but got no valid session id")
      except Exception as e:
        print(f"An error occurred while checking interface: {e}")
    # No match :(
    return None
  #endregion
  
  #region Sensor readings for socket
  async def read_sensors_and_send(self):
    while True:
      sensor_readings = {
        "joystick_x": self.joystick_x.value,
        "joystick_y": self.joystick_y.value,
        "joystick_pressed": self.joystick_button.is_pressed,
        "button_a": self.button_a.is_pressed,
        "button_left": self.button_left.is_pressed,
        "button_right": self.button_right.is_pressed,
        "active_profile_id": self.active_profile_id,
      }
      if self.websocket.connected:
        await self.websocket.emit("message", {"type": "E2S_RemoteState", "data": sensor_readings})
      await asyncio.sleep(0.25)
  #endregion
  
  #region Get profiles
  async def check_profiles_loop(self):
    while True:
      # Since first run is on start we wait before the next one
      await asyncio.sleep(5)
      await self.check_profiles()
  #endregion
    
# ---------- Init code ----------
if __name__ == "__main__":
  load_dotenv()
  
  url = os.getenv('URL')
  api_key = os.getenv('API_KEY')
  print("Configured url is: " + url)

  use_direct_connection = os.getenv("USE_DIRECT_CONNECTION") == "true"
  remote = Remote(url, api_key, use_direct_connection)
  asyncio.run(remote.start())