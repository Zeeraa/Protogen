import re
import os
import requests
import asyncio
import socketio
import aiohttp
import time

from gpiozero import Button, MCP3008
from dotenv import load_dotenv
from luma.core.interface.serial import i2c
from luma.oled.device import ssd1306
from luma.core.render import canvas
from PIL import ImageFont, ImageDraw

FONT_SIZE = 16
FONT_PATH = "Tamzen8x16b.ttf"
SOCKETIO_PATH = "/protogen-websocket.io"

class Action:
  def __init__(self, input_type, action_type, action):
    self.input_type = input_type
    self.action_type = action_type
    self.action = action

class Profile:
  def __init__(self, id, name, click_to_activate, actions):
    self.id = id
    self.name = name
    self.click_to_activate = click_to_activate
    self.actions = actions

# ---------- Remote class ----------
class Remote:
  def __init__(self, api_url, api_key, use_direct_connection):
    self.api_url = api_url
    self.api_key = api_key
    self.use_direct_connection = use_direct_connection
    self.websocket = None
    
    # Joystick ADC and button
    self.joystick_x = MCP3008(0)
    self.joystick_y = MCP3008(1)
    self.joystick_button = Button(16, bounce_time=0.05)
    
    # Other buttons
    self.button_a = Button(23, pull_up=True, bounce_time=0.05)
    self.button_left = Button(24, pull_up=True, bounce_time=0.05)
    self.button_right = Button(25, pull_up=True, bounce_time=0.05)
    
    self.invert_x = False
    self.invert_y = False
    self.flip_axis = False
    
    self.connected = False
    self.active_profile_index = 0
    self.profiles = []
    
    if not os.path.exists(FONT_PATH):
      print("Error: Configured font not found!")
      self.font = ImageFont.load_default()
    else:
      self.font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    self.serial = i2c(port=1, address=0x3C)  # Default I2C address for SSD1306
    self.display = ssd1306(self.serial)
    
    # Start input listeners
    self.button_right.when_pressed = self.next_profile
    self.button_left.when_pressed = self.previous_profile
    
    self.draw_text("Starting...")

  def draw_text(self, text):
    with canvas(self.display) as draw:
      draw.rectangle((0, 0, self.display.width, self.display.height), outline=0, fill=0)
      
      y_offset = 0
      for line in text.split('\n'):
        draw.text((0, y_offset), line, font=self.font, fill=255)
        y_offset += FONT_SIZE + 2
  
  #region Profile data loading
  async def sync_settings(self):
    async with aiohttp.ClientSession() as session:
      async with session.get(self.api_url + "/api/remote/config/full", headers={"x-api-key": api_key}) as response:
        if response.status == 200:
          data = await response.json()
          
          self.invert_x = data.get("invertX")
          self.invert_y = data.get("invertY")
          self.flip_axis = data.get("flipAxis")
          
          profiles = []
          for profile in data["profiles"]:
            actions = []
            for action in profile["actions"]:
              actions.append(Action(action["inputType"], action["actionType"], action["action"]))
            profiles.append(Profile(profile["id"], profile["name"], profile["clickToActivate"], actions))
          
          # Make sure we are not above the max index
          profile_count = len(profiles)
          if profile_count == 0:
            self.active_profile_index = 0
          elif self.active_profile_index >= profile_count:
            self.active_profile_index = profile_count - 1
          
          self.profiles = profiles
          self.update_display()
          
        else:
          print(f"Error while fetching config: {response.status}")
          return None
  #endregion
  
  #region Start function
  async def start(self):
    if self.use_direct_connection:
      self.draw_text("Scan server")
      print("Direct conection enabled. Trying to find optimal interface for communication")
      optimal_url = self.find_optimal_url()
      if optimal_url is None:
        print("Could not find direct connection")
        self.draw_text("No direct\nconnection")
        time.sleep(2)
      else:
        print("Found direct connection url " + optimal_url)
        self.api_url = optimal_url
        self.draw_text("Found server\n" + re.sub(r'^https?://', '', optimal_url))
        time.sleep(2)
    
    self.draw_text("Fetch config")
    await self.sync_settings()
    
    self.draw_text("WS Connect...")
    self.websocket = socketio.AsyncClient(reconnection=True, reconnection_attempts=0)
    self.websocket.on("connect", self.on_connect)
    self.websocket.on("connect_error", self.on_connect_error)
    self.websocket.on("disconnect", self.on_disconnect)
    self.websocket.on("message", self.on_message)
    
    sensor_task = asyncio.create_task(self.read_sensors_and_send())
    sync_settings_task = asyncio.create_task(self.sync_settings_loop())
    socket_connection_task = asyncio.create_task(self.connect_to_socket())
    
    await asyncio.gather(sensor_task, sync_settings_task, socket_connection_task)
  #endregion
  
  def update_display(self):
    if not self.connected:
      self.draw_text("Disconnected")
    else:
      header = "P["
      profile_name = "No Profile :("
      
      profile_count = len(self.profiles)
      
      if profile_count == 0:
        header += "0/0" 
      else:
        header += str(self.active_profile_index + 1) + "/" + str(profile_count)
        active_profile = self.profiles[self.active_profile_index]
        profile_name = active_profile.name
        
      header += "]"
      self.draw_text(header + "\n" + profile_name)
  
  #region Websocket
  def on_connect(self):
    self.connected = True
    print("Connected to the websocket!")
    self.update_display()

  def on_connect_error(self, data):
    print("Socket connection failed:", data)

  def on_disconnect(self):
    self.connected = False
    print("Socket disconnected. Attempting to reconnect...")
    self.update_display()
  
  async def on_message(self, data):
    if data.get("type") == "S2E_RemoteProfileChange":
      await self.sync_settings()
    elif data.get("type") == "S2E_RemoteConfigChange":
      settings = data.get("data")
      self.invert_x = settings.get("invertX")
      self.invert_y = settings.get("invertY")
      self.flip_axis = settings.get("flipAxis")
  
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
  
  #region Sensor readings
  async def read_sensors_and_send(self):
    while True:
      x = self.joystick_x.value
      y = self.joystick_y.value
      
      if self.flip_axis:
        x, y = y, x
      
      if self.invert_x:
        x = 1 - x
        
      if self.invert_y:
        y = 1 - y
      
      active_profile_id = -1
      if len(self.profiles) > 0:
        active = self.profiles[self.active_profile_index]
        active_profile_id = active.id
      
      sensor_readings = {
        "joystick_x": x,
        "joystick_y": y,
        "joystick_pressed": self.joystick_button.is_pressed,
        "button_a": self.button_a.is_pressed,
        "button_left": self.button_left.is_pressed,
        "button_right": self.button_right.is_pressed,
        "active_profile_id": active_profile_id,
      }
      if self.websocket.connected:
        await self.websocket.emit("message", {"type": "E2S_RemoteState", "data": sensor_readings})
      await asyncio.sleep(1.0 / 8.0) # 8 times per second
  
  def next_profile(self):
    self.active_profile_index += 1
    if self.active_profile_index >= len(self.profiles):
      self.active_profile_index = 0
    self.update_display()
    
  def previous_profile(self):
    self.active_profile_index -= 1
    if self.active_profile_index < 0:
      self.active_profile_index = len(self.profiles) - 1
    self.update_display()
  #endregion
  
  #region Get profiles
  async def sync_settings_loop(self):
    while True:
      # Since first run is on start we wait before the next one
      await asyncio.sleep(60 * 60 * 1) # Every minute
      await self.sync_settings()
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