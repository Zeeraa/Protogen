import { NextFunction, Request, Response } from "express";
import { ProtogenWebServer } from "../ProtogenWebServer";
import { User } from "../../database/models/user/User.model";

export const AuthMiddleware = (webServer: ProtogenWebServer) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const user = await webServer.protogen.userManager.validateJWTToken(token);

        if (user != null) {
          req.auth = {
            isSuperUser: user.superUser,
            user: user,
          };

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
  /** Can be null if using api key */
  user: User | null;
}