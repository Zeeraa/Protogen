import os
import requests

from dotenv import load_dotenv
from time import sleep
from gpiozero import MCP3008

load_dotenv()

def get_session_id(url, timeout = 30):
  print("Trying to get session id of " + url)
  response = requests.get(url + "/api/discovery", timeout=timeout)
  if response.status_code != 200:
    print("Failed to get session id")
    return None
  data = response.json()
  session_id = data.get("sessionId")
  print("Session id: " + str(session_id))
  return session_id

def find_optimal_url(url):
  global api_key
  headers = {
    "X-api-key": api_key
  }
  
  print("Trying to find optimal address to api")
  print("Reading discovery data")
  response = requests.get(url + "/api/discovery/interfaces", headers=headers)
  if response.status_code != 200:
    print("Failed to read discovery data. Status: " + str(response.status_code))
    return None
  
  discovery = response.json()
  session_id = discovery.get("sessionId")
  print("Session id: " + str(session_id))

  interfaces = discovery.get("interfaces")
  for interface in interfaces:
    try:
      print("Trying to contact api on ip " + interface.get("address"))
      direct_url = "http://" + interface.get("address")
      other_session_id = get_session_id(direct_url, timeout=3)
      if other_session_id is None:
        print("No session id found")
      elif session_id == other_session_id:
        print("Sesion id matches. Found a direct connection at " + direct_url)
        return direct_url
      else:
        print("Other url responded but got no valid session id")
    except Exception as e:
      print(f"An error occurred while checking interface: {e}")
  # No match. use provided external url
  return url

#joystick_x = MCP3008(0)
#joystick_y = MCP3008(1)
#
#while True:
#  print("x: " + str(round(joystick_x.value, 4)) + " y: " + str(round(joystick_y.value, 4)))
#  sleep(0.1)
  

url = os.getenv('URL')
api_key = os.getenv('API_KEY')
print("Configured url is: " + url)

if os.getenv("USE_DIRECT_CONNECTION") == "true":
  print("Direct conection enabled. Trying to find optimal interface for communication")
  url = find_optimal_url(url)
  print("Url to use: " + url)