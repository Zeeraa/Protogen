import { Protogen } from "../Protogen";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { cyan, yellow } from "colors";
import { existsSync, readFileSync } from "fs";
import swaggerUi from "swagger-ui-express";
import { VideoPlayerRouter } from "./routes/video-player/VideoPlayerRouter";
import { AudioRouter } from "./routes/volume/AudioRouter";
import { VisorRouter } from "./routes/visor/VisorRouter";
import { SystemRouter } from "./routes/system/SystemRouter";
import { RgbRouter } from "./routes/rgb/RgbRouter";
import { createServer } from "http";
import { Server, Socket } from 'socket.io';
import { UserSocketSession } from "./socket/UserSocketSession";
import { SocketMessageType } from "./socket/SocketMessageType";
import { SocketMessage } from "./socket/SocketMessage";
import { HudRouter } from "./routes/hud/HudRouter";
import { ImageRouter } from "./routes/images/ImageRouter";
import { UserRouter } from "./routes/user/UserRouter";
import { AuthRouter } from "./routes/auth/AuthRouter";
import { AuthMiddleware } from "./middleware/AuthMiddleware";

export class ProtogenWebServer {
  private _protogen;
  private _express;
  private _http;
  private _socket;
  private _sessions: UserSocketSession[];
  private _authMiddleware;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._sessions = [];

    this._express = express();
    this._http = createServer(this._express);
    this._socket = new Server(this._http, {
      path: "/protogen-websocket.io",
    });

    this._authMiddleware = AuthMiddleware(this);

    this.express.use(cors())
    this.express.use(bodyParser.json());

    new VideoPlayerRouter(this).register();
    new AudioRouter(this).register();
    new VisorRouter(this).register();
    new SystemRouter(this).register();
    new RgbRouter(this).register();
    new HudRouter(this).register();
    new ImageRouter(this).register({ noAuth: true });
    new UserRouter(this).register();
    new AuthRouter(this).register({ noAuth: true });

    this.socket.on("connection", (socket: Socket) => {
      const session = new UserSocketSession(this.protogen, socket);
      this._sessions.push(session);
      this.protogen.logger.info("WebServer", "Socket connected with id " + cyan(session.sessionId) + ". Client count: " + cyan(String(this._sessions.length)));
    });


    if (existsSync("./swagger.json")) {
      this.protogen.logger.info("WebServer", "Reading swagger.json");
      const swagger = JSON.parse(readFileSync("./swagger.json").toString());
      this.express.use("/", swaggerUi.serve, swaggerUi.setup(swagger));
    } else {
      this.protogen.logger.warn("WebServer", yellow("Could not find swagger.json. No api documentation will be available"));
    }

    setInterval(() => {
      this.broadcastMessage(SocketMessageType.S2C_Ping, {});
    }, 5000);
  }

  public disconnectSocket(session: UserSocketSession) {
    session.disconnect();
    this._sessions = this._sessions.filter(s => s.sessionId != session.sessionId);
    this.protogen.logger.info("WebServer", "Socket with id " + cyan(session.sessionId) + " disconnected. Client count: " + cyan(String(this._sessions.length)));
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

  public get socketSessions() {
    return this._sessions;
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

  public get authMiddleware() {
    return this._authMiddleware;
  }

  public broadcastMessage(type: SocketMessageType, data: any) {
    const message: SocketMessage = {
      type: type,
      data: data,
    }
    this._socket.emit("message", message);
  }
}