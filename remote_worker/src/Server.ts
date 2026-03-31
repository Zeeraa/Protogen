import morgan from "morgan";
import bodyParser from "body-parser";
import cors from 'cors';
import https from 'https';
import swaggerUi from "swagger-ui-express";
import express from "express";

import * as helmet from "helmet";

import { Express, Request, Response } from "express";
import { Configuration } from "./configuration/Configuration";
import { ExitCodes } from "./enum/ExitCodes";
import { cyan, green, red, yellow } from "colors";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { VideoDownloaderRouter } from "./routes/video_downloader/VideoDownloaderRouter";
import { VideoDownloadManager } from "./video_downloader/VideoDownloaderManager";

export class Server {
  public readonly configuration;
  public readonly express: Express;
  public readonly videoDownloadManager: VideoDownloadManager;
  public readonly dataDirectory: string;

  constructor(config: Configuration) {
    this.configuration = config;

    this.dataDirectory = "./data";
    if (!existsSync(this.dataDirectory)) {
      mkdirSync(this.dataDirectory);
    }

    this.videoDownloadManager = new VideoDownloadManager(this);

    //#region Express and middleware
    this.express = express();
    this.express.use(cors());
    this.express.use(bodyParser.json());
    this.express.use(helmet.hidePoweredBy());
    this.express.use(morgan("combined"));
    if (String(process.env["TRUST_PROXY"]).toLowerCase() == "true") {
      this.express.set('trust proxy', true);
    }
    //#endregion

    if (this.configuration.apiKey == null) {
      console.warn(red("No api key defined. The server will not use authentication"));
    } else {
      console.log("Using api key for authentication");
      this.express.use((req, res, next) => {
        if (req.headers.authorization == null) {
          return res.status(401).send({ message: "Missing auth header" });
        }
        const headerValue = req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.replace('Bearer ', '') : req.headers.authorization;
        if (headerValue == this.configuration.apiKey) {
          return next();
        }
        return res.status(401).send({ message: "Invalid api key" });
      });
    }

    this.init().then(() => {
      console.log(green("Ready"));

      // Register swagger last so that it does not overwrite our endpoints
      //#region Swagger
      if (existsSync("./swagger.json")) { // Path is relative to where the npm command runns from here
        //TODO: replace with readFileSync
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const swaggerOutput = require("../swagger.json"); // But relative to the Server.ts file here
        this.express.use("/", swaggerUi.serve, swaggerUi.setup(swaggerOutput));
      } else {
        console.error(red("Could not find swagger.json. Make sure to run \"npm run swagger\" before starting the server"));
        console.warn(yellow("Swagger documentation will not be available until this is resolved"));
        this.express.get("/", (_: Request, res: Response) => {
          res.send("Could not find swagger.json. Make sure to run \"npm run swagger\" before starting the server");
        });
      }
      //#endregion
    }).catch(err => {
      console.error(red("An error occured while starting server"), err);
      process.exit(ExitCodes.INIT_FAILED);
    });
  }

  private async init() {
    await this.videoDownloadManager.init();

    //#region Register endpoints
    new VideoDownloaderRouter(this).register();
    //#endregion

    if (this.configuration.autoUpdate) {
      console.log(green("Auto update is enabled. Checking for updates..."));
      await this.videoDownloadManager.update();
      this.scheduleMidnightUpdate();
    }

    await this.startExpress();
  }

  private scheduleMidnightUpdate() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    console.log(green(`Auto update scheduled. Next update in ${Math.round(msUntilMidnight / 1000 / 60)} minutes (at midnight)`));

    setTimeout(async () => {
      console.log(green("Running scheduled midnight auto update..."));
      try {
        await this.videoDownloadManager.update();
      } catch (err) {
        console.error(red("Scheduled auto update failed:"), err);
      }
      this.scheduleMidnightUpdate();
    }, msUntilMidnight);
  }

  //#region Start express
  private startExpress() {
    return new Promise<void>((resolve, reject) => {
      try {
        if (this.configuration.web.sslKeyPath != null) {
          console.log("Using HTTPS");
          console.log("Reading private key...");
          const privateKey = readFileSync(this.configuration.web.sslKeyPath!, 'utf8');
          console.log("Reading certificate...");
          const certificate = readFileSync(this.configuration.web.sslCertPath!, 'utf8');
          const credentials = { key: privateKey, cert: certificate };
          const httpsServer = https.createServer(credentials, this.express);
          httpsServer.listen(this.configuration.web.port, () => {
            console.log(green("HTTPS listening on port:"), cyan(String(this.configuration.web.port)));
            resolve();
          });
        } else {
          console.log("Using HTTP");
          this.express.listen(this.configuration.web.port, () => {
            console.log(green("Express listening on port:"), cyan(String(this.configuration.web.port)));
            resolve();
          });
        }
      } catch (err) {
        console.error(red("An error occured while starting express"));
        reject(err);
      }
    });
  }
  //#endregion
}
