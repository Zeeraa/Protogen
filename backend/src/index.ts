import 'reflect-metadata';
import dotenv from "dotenv";
import consoleStamp from "console-stamp";
import { loadConfiguration } from "./config/ConfigLoader";
import { Protogen } from "./Protogen";
import { red, yellow } from "colors";
import { readFileSync } from 'fs';
import { ArgumentParser } from 'argparse';

try {
  dotenv.config();
  consoleStamp(console);

  const parser = new ArgumentParser({
    description: 'Protogen backend server',
  });

  parser.add_argument('--with-systemd', {
    action: 'store_true',
    help: 'Indicate that the backend was lauches with systemd. This enables things like restarting the server from within the app.',
  });

  parser.add_argument('--led-width', {
    type: 'int',
    help: 'Override the width of the LED matrix defined in the config file. This is the total width of all connected panels.',
  });

  parser.add_argument('--led-height', {
    type: 'int',
    help: 'Override the height of the LED matrix defined in the config file. This is the total height of all connected panels .',
  });

  const args = parser.parse_args();
  if (args.led_width != null) {
    process.env["LED_WIDTH"] = args.led_width.toString();
  }

  if (args.led_height != null) {
    process.env["LED_HEIGHT"] = args.led_height.toString();
  }

  if (args.with_systemd) {
    process.env["WITH_SYSTEMD"] = "true";
  }

  console.log("Reading configuration");
  const config = loadConfiguration();

  console.log("Creating server instance");
  const protogen = new Protogen(config);

  console.log("Protogen::init()");
  protogen.init().catch(err => {
    console.error(red("An error occured while calling Protogen::init()"), err);
    try {
      if (protogen?.visor?.initCalled) {
        console.log("Drawing error message using visor renderer");
        protogen.visor?.tryRenderTextFrame("BOOT ERROR :(\nInit failed!\nCheck logs", "#FF0000");
        process.exit(2);
      } else {
        console.log("Visor not ready. Trying to push data directly to flaschen taschen");
        if (protogen.flaschenTaschen != null) {
          const buffer = readFileSync("./assets/crash_msg.png");
          protogen.flaschenTaschen.sendImageBuffer(buffer, config.ledMatrix.width, config.ledMatrix.height).then(() => {
            process.exit(2);
          });
        } else {
          console.warn(yellow("Could not draw error messsage since flaschen taschen class has not been created yet"));
        }
      }
    } catch (err) {
      console.error(red("Also got an error while trying to display error message. Wow this is a bad day"), err);
    }


  });
} catch (err) {
  console.error(red("An error occured while starting"), err);
  process.exit(1);
}