import { Request, Response, Router } from "express";
import { Protogen } from "../Protogen";
import { ProtogenWebServer } from "./ProtogenWebServer";
import { cyan, yellow } from "colors";

export abstract class AbstractRouter {
  private _webServer;
  private _router;
  private _path;
  private _registerCalled = false;

  constructor(webServer: ProtogenWebServer, path: string) {
    this._webServer = webServer;
    this._path = path;
    this._router = Router();

  }

  protected get router() {
    return this._router;
  }

  protected get path() {
    return this._path;
  }

  protected get webServer() {
    return this._webServer;
  }

  protected get protogen() {
    return this.webServer.protogen;
  }

  public register() {
    if (this._registerCalled) {
      console.warn(yellow("Attempted to call register twice in endpoint " + this.path));
      return;
    }
    this._registerCalled = true;
    this.protogen.logger.info("Router", "Registering endpoint " + cyan(this.path));
    this.webServer.express.use(this.path, this.router);
  }

  protected handleError(err: any, req: Request, res: Response) {
    console.error(err);
    let message = err.message;
    if (err.message == null) {
      message = String(err);
    }
    this.protogen.logger.error("WebServer", "An error occured in endpoint " + req.path + ". " + message);
    if (!res.headersSent) {
      res.status(500).send({
        message: "An internal error occured",
      });
    }
  }
}