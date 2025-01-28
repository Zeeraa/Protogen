import { NextFunction, Request, Response } from "express";
import { ProtogenWebServer } from "../ProtogenWebServer";
import { User } from "../../database/models/user/User.model";
import { ApiKeyHeader } from "../../apikeys/ApiKeyManager";

export const AuthMiddleware = (webServer: ProtogenWebServer) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const user = await webServer.protogen.userManager.validateJWTToken(token);

        if (user != null) {
          req.auth = {
            type: AuthType.Token,
            isSuperUser: user.superUser,
            user: user,
          };

          next();
          return;
        }
      }

      const apiKeyString = req.headers[ApiKeyHeader];
      if (apiKeyString != null) {
        const key = webServer.protogen.apiKeyManager.keys.find(k => k.apiKey == apiKeyString);
        if (key != null) {
          req.auth = {
            type: AuthType.ApiKey,
            isSuperUser: key.superUser,
            user: null,
          }

          next();
          return;
        }
      }

      res.status(401).json({ message: 'Unauthorized' });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error while processing authentication" });
    }
  }
}

export interface AuthData {
  isSuperUser: boolean;
  type: AuthType;
  /** Can be null if using api key */
  user: User | null;
}

export enum AuthType {
  Token = "Token",
  ApiKey = "ApiKey",
}