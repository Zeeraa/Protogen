import 'reflect-metadata';
import dotenv from "dotenv";
import consoleStamp from "console-stamp";
import { loadConfiguration } from "./config/ConfigLoader";
import { Protogen } from "./Protogen";
import { red } from "colors";

let protogen: Protogen | null = null;
try {
  dotenv.config();
  consoleStamp(console);

  console.log("Reading configuration");
  const config = loadConfiguration();

  console.log("Creating server instance");
  protogen = new Protogen(config);

  console.log("Protogen::init()");
  protogen.init().catch(err => {
    console.error(red("An error occured while calling Protogen::init()"), err);
    protogen?.visor.tryRenderTextFrame("BOOT ERROR :(\nInit failed!\nCheck logs", "#FF0000");
    process.exit(1);
  });
} catch (err) {
  console.error(red("An error occured while starting"), err);
  console.log(protogen);
  protogen?.visor.tryRenderTextFrame("BOOT ERROR :(\nFailed to start!\nCheck logs", "#FF0000");
  process.exit(1);
}