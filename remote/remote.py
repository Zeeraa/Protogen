import os
import requests

from dotenv import load_dotenv
from time import sleep
from gpiozero import Button, MCP3008

# ---------- Remote class ----------
class Remote:
  def __init__(self, api_url, api_key, use_direct_connection):
    self.api_url = api_url
    self.api_key = api_key
    self.use_direct_connection = use_direct_connection
    
    # Joystick ADC and button
    self.joystick_x = MCP3008(0)
    self.joystick_y = MCP3008(1)
    self.joystick_button = Button(13)
    
    # Other buttons
    self.button_a = Button(5, pull_up=True)
    self.button_left = Button(4, pull_up=True)
    self.button_right = Button(6, pull_up=True)
  
  #region Start function
  def start(self):
    if self.use_direct_connection:
      print("Direct conection enabled. Trying to find optimal interface for communication")
      optimal_url = self.find_optimal_url()
      if optimal_url is None:
        print("Could not find direct connection")
      else:
        print("Found direct connection url " + optimal_url)
        self.api_url = optimal_url
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
      "X-api-key": self.api_key
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
    
# ---------- Init code ----------
if __name__ == "__main__":
  load_dotenv()
  
  url = os.getenv('URL')
  api_key = os.getenv('API_KEY')
  print("Configured url is: " + url)

  use_direct_connection = os.getenv("USE_DIRECT_CONNECTION") == "true"
  remote = Remote(url, api_key, use_direct_connection)
  remote.start()