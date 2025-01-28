import { AuthData } from "../webserver/middleware/AuthMiddleware";

declare global {
  namespace Express {
    interface Request {
      auth: AuthData;
    }
  }
}