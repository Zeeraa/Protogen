import { Request, RequestHandler, Response, Router } from "express";
import { Server } from "../Server";
import { cyan, red } from "colors";

/**
 * This class is used to create api endpoints. After creating an instance call register() to register the endpoint in express.
 *
 * Remember to add the path to the endpoint file in the endpointFiles array in src/Swagger.ts
 */
export class RouterBase {
  private _server;
  private _router: Router;
  private _path: string;
  private _handlerList: RequestHandler[] = [];
  private _showStacktraceInResponse: boolean = false;

  /**
   * Contructor for a server endpoint
   * @param server Instance of the server class
   * @param path The path that the endpoint should be registered at
   */
  constructor(server: Server, path: string) {
    this._server = server;
    this._path = path;
    this._router = Router();
  }

  /**
   * Register the endpoint
   * @param handlers Array of additional handlers to use
   */
  register(options: RegisterOptions = {}) {
    const handlers: RequestHandler[] = [];
    handlers.push(...this.handlerList);
    if (options.handlers != null) {
      handlers.push(...options.handlers);
    }

    if (options.showStacktraceInResponse != null) {
      this._showStacktraceInResponse = options.showStacktraceInResponse;
    }

    this.server.express.use(this.path, handlers, this.router);
  }

  /**
   * Get an instance of the server class
   */
  get server() {
    return this._server;
  }

  /**
   * Get the path this endpoint is registered at
   */
  get path() {
    return this._path;
  }

  /**
   * GEt the router class for this endpoint
   */
  protected get router() {
    return this._router;
  }

  /**
   * List of additional handlers to use
   */
  protected get handlerList() {
    return this._handlerList;
  }

  /**
   * Call this function to report an error in the request
   * @param err The error object
   * @param req The request object
   * @param res The reponse object
   */
  protected handleError(err: any, req: Request, res: Response) {
    let errorString = String(err);
    if (err.stack != null) {
      errorString = String(err.stack);
    }

    let extras: any = {};
    if (this._showStacktraceInResponse) {
      extras["stacktrace"] = errorString;
    }

    res.status(500).send({ ...extras, message: "A server side error occured" });
    console.log(red("An error occured while handling request to ") + cyan(req.originalUrl) + "\n", err);
  }
}

interface RegisterOptions {
  handlers?: RequestHandler[];
  showStacktraceInResponse?: boolean;
}
