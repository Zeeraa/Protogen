import { Protogen } from "../Protogen";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { cyan, yellow } from "colors";
import { existsSync, readFileSync } from "fs";
import swaggerUi from "swagger-ui-express";
import { VideoPlayerRouter } from "./routes/video-player/VideoPlayerRouter";
import { AudioRouter } from "./routes/volume/AudioRouter";
import { VisorRouter } from "./routes/viror/VisorRouter";
import { SystemRouter } from "./routes/system/SystemRouter";
import { RgbRouter } from "./routes/rgb/RgbRouter";
import { createServer } from "http";
import { Server, Socket } from 'socket.io';
import { UserSocketSession } from "./socket/UserSocketSession";

export class ProtogenWebServer {
  private _protogen;
  private _express;
  private _http;
  private _socket;
  private _sessions: UserSocketSession[];

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._sessions = [];

    this._express = express();
    this._http = createServer(this._express);
    this._socket = new Server(this._http);

    this.express.use(cors())
    this.express.use(bodyParser.json());

    new VideoPlayerRouter(this).register();
    new AudioRouter(this).register();
    new VisorRouter(this).register();
    new SystemRouter(this).register();
    new RgbRouter(this).register();

    this.socket.on("connection", (socket: Socket) => {
      const session = new UserSocketSession(this.protogen, socket);
      this._sessions.push(session);
      this.protogen.logger.info("WebServer", "Socket connected with id " + cyan(session.sessionId));
    });


    if (existsSync("./swagger.json")) {
      this.protogen.logger.info("WebServer", "Reading swagger.json");
      const swagger = JSON.parse(readFileSync("./swagger.json").toString());
      this.express.use("/", swaggerUi.serve, swaggerUi.setup(swagger));
    } else {
      this.protogen.logger.warn("WebServer", yellow("Could not find swagger.json. No api documentation will be available"));
    }
  }

  public disconnectSocket(session: UserSocketSession) {
    session.disconnect();
    this._sessions = this._sessions.filter(s => s.sessionId != session.sessionId);
    this.protogen.logger.info("WebServer", "Socket with id " + cyan(session.sessionId) + " disconnected");
  }

  public init() {
    return new Promise<void>((resolve, reject) => {
      try {
        this._http.listen(this.config.port, () => {
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

  public get socket() {
    return this._socket;
  }
}