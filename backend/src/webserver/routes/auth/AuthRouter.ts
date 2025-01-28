import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { Request, Response } from "express";

const AuthFailResponse = { message: "Invalid username or password" };
Object.freeze(AuthFailResponse);

export class AuthRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/auth");

    this.router.post("/authenticate", async (req, res) => {
      /*
      #swagger.path = '/auth/authenticate'
      #swagger.tags = ['Auth'],
      #swagger.description = "Authenticate and get a token for use with api calls"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[401] = { description: "Invalid credentials provided" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'User credentials',
        schema: {
          username: "admin",
          password: "123qwe",
        }
      }
      */
      try {
        const parsed = AuthModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const user = await this.protogen.userManager.getUserByName(data.username);

        if (user == null) {
          this.protogen.logger.info("Auth", "Authentication failed for remote " + req.ip);
          res.status(401).json(AuthFailResponse);
          return;
        }

        if (!await this.protogen.userManager.validatePasswordHash(user.password, data.password)) {
          this.protogen.logger.info("Auth", "Authentication failed for remote " + req.ip);
          res.status(401).json(AuthFailResponse);
          return;
        }

        const token = this.protogen.userManager.generateToken(user);

        res.json({ token })
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/refresh-token", [this.authMiddleware], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/auth/refresh-token'
      #swagger.tags = ['Auth'],
      #swagger.description = "Refresh auth token"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Tried to refresh token but authenticated with api key" }
      #swagger.responses[401] = { description: "Unauthorized" }
      #swagger.responses[500] = { description: "An internal error occured" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const user = req.auth!.user;

        if (user == null) {
          res.status(400).send({ message: "Tried to refresh token but authenticated with api key" });
          return;
        }

        const token = await this.protogen.userManager.generateToken(user);

        res.json({ token })
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

export const AuthModel = z.object({
  username: z.string(),
  password: z.string(),
})