import 'reflect-metadata';
import dotenv from 'dotenv';
import consoleStamp from 'console-stamp';
import { loadConfiguration } from './configuration/Configuration';
import { Server } from './Server';
import { red, yellow } from 'colors';
import { ExitCodes } from './enum/ExitCodes';


dotenv.config();

if (String(process.env["NO_CONSOLESTAMP"]).toLocaleLowerCase() != "true") {
  consoleStamp(console);
}

console.log("Reading configuration...");
loadConfiguration().then(config => {
  console.log("Starting server...");
  try {
    new Server(config);
  } catch (err) {
    console.error(red("An error occured while starting server"), err);
    process.exit(ExitCodes.INIT_FAILED);
  }
}).catch((err: Error) => {
  console.error(red("===== FAILED TO START ====="));
  console.error(yellow("An error occured while loading configuration: " + red(err.message)));
  console.error("");
  console.error(red("Stacktrace: "), err);
  console.error(red("==========================="));
  process.exit(ExitCodes.CONFIG_ERROR);
});
