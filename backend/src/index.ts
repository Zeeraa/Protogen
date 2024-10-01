import dotenv from "dotenv";
import consoleStamp from "console-stamp";
import { loadConfiguration } from "./config/ConfigLoader";
import { Protogen } from "./Protogen";
import { red } from "colors";

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
  });
} catch (err) {
  console.error(red("An error occured while starting"), err);
}