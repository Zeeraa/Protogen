import { Protogen } from "../Protogen";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { cyan, yellow } from "colors";
import { VideoPlayerRouter } from "./routes/videoplayer/VideoPlayerRouter";
import { existsSync, readFileSync } from "fs";
import swaggerUi from "swagger-ui-express";
import { AudioRouter } from "./routes/volume/AudioRouter";

export class ProtogenWebServer {
  private _protogen;
  private _express;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._express = express();

    this.express.use(cors())
    this.express.use(bodyParser.json());

    new VideoPlayerRouter(this).register();
    new AudioRouter(this).register();

    if (existsSync("./swagger.json")) {
      this.protogen.logger.info("WebServer", "Reading swagger.json");
      const swagger = JSON.parse(readFileSync("./swagger.json").toString());
      this.express.use("/", swaggerUi.serve, swaggerUi.setup(swagger));
    } else {
      this.protogen.logger.warn("WebServer", yellow("Could not find swagger.json. No api documentation will be available"));
    }
  }

  public init() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.express.listen(this.config.port, () => {
          this.protogen.logger.info("WebServer", "Listening on port " + cyan(String(this.config.port)));
        });
        resolve();
      } catch (err) {
        this.protogen.logger.error("WebServer", "Failed to start express");
        reject(err);
      }
    });
  }

  private get config() {
    return this.protogen.config.web;
  }

  public get express() {
    return this._express;
  }

  public get protogen() {
    return this._protogen;
  }
}