import 'reflect-metadata';
import dotenv from "dotenv";
import consoleStamp from "console-stamp";
import { loadConfiguration } from "./config/ConfigLoader";
import { Protogen } from "./Protogen";
import { red, yellow } from "colors";
import { readFileSync } from 'fs';

try {
  dotenv.config();
  consoleStamp(console);

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