import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { Request, Response } from "express";
import { PasswordlessSignInRequest } from "../../../database/models/auth/PasswordlessSignInRequest.model";
import { uuidv7 } from "uuidv7";
import { Equal, IsNull, MoreThan, Not } from "typeorm";
import { AuthType } from "../../middleware/AuthMiddleware";

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

    this.router.post("/passwordless-signin/new", async (req, res) => {
      /*
      #swagger.path = '/auth/passwordless-signin/new'
      #swagger.tags = ['Auth'],
      #swagger.description = "Create a new passwordless signin request"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const repo = this.protogen.database.dataSource.getRepository(PasswordlessSignInRequest);

        const request = new PasswordlessSignInRequest();

        request.uuid = uuidv7();
        request.expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

        // Make up to 100 attempts to generate a unique key
        for (let i = 0; i < 100; i++) {
          // Generate a key with 8 random numbers in range 0-9
          const key = Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
          const existing = await repo.findOne({ where: { signinKey: key } });
          if (existing == null) {
            request.signinKey = key;
            break;
          }
        }

        if (request.signinKey == null) {
          throw new Error("Failed to generate a unique signin key");
        }

        const result = await repo.save(request);

        res.json({ requestId: result.uuid, signinKey: result.signinKey });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/passwordless-signin/check", async (req, res) => {
      /*
      #swagger.path = '/auth/passwordless-signin/check'
      #swagger.tags = ['Auth'],
      #swagger.description = "Check the status of a passwordless signin request"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more details" }
      #swagger.responses[404] = { description: "Request not found or expired" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const parsed = PasswordlessSignInRequestModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        const repo = this.protogen.database.dataSource.getRepository(PasswordlessSignInRequest);

        const request = await repo.findOne({
          where: {
            uuid: data.requestId,
            signinKey: data.signinKey,
            expiresAt: MoreThan(new Date()),
          },
          relations: {
            approvedBy: true,
          }
        });

        if (request == null) {
          res.status(404).send({ message: "Request not found or expired" });
          return;
        }

        let approvedBy: { name: string } | null = null;
        if (request.approvedBy != null) {
          approvedBy = { name: request.approvedBy.username };
        }

        res.json({
          requestId: request.uuid,
          signinKey: request.signinKey,
          expiresAt: request.expiresAt,
          used: request.used,
          approvedBy: approvedBy,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/passwordless-signin/authenticate", async (req, res) => {
      /*
      #swagger.path = '/auth/passwordless-signin/authenticate'
      #swagger.tags = ['Auth'],
      #swagger.description = "Use approved passwordless signin request to authenticate and get a token"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more details" }
      #swagger.responses[404] = { description: "Request expired, not found, not approved or already used" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const parsed = PasswordlessSignInRequestModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        const repo = this.protogen.database.dataSource.getRepository(PasswordlessSignInRequest);

        const request = await repo.findOne({
          where: {
            uuid: data.requestId,
            signinKey: data.signinKey,
            expiresAt: MoreThan(new Date()),
            used: Equal(false),
            approvedBy: Not(IsNull()),
          },
          relations: {
            approvedBy: true,
          }
        });

        if (request == null) {
          res.status(404).send({ message: "Request not found, expired, used or not approved" });
          return;
        }

        request.used = true;
        await repo.save(request);

        const token = this.protogen.userManager.generateToken(request.approvedBy);

        res.json({
          token: token,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/passwordless-signin/approve", [this.authMiddleware], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/auth/passwordless-signin/approve'
      #swagger.tags = ['Auth'],
      #swagger.description = "Approve a passwordless signin request"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more details" }
      #swagger.responses[403] = { description: "Your auth type does not support approvals for passwordless auth" }
      #swagger.responses[404] = { description: "Request expired or not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        if (req.auth?.type != AuthType.Token || req.auth?.user == null) {
          res.status(403).send({ message: "Your auth type does not support approvals for passwordless auth" });
          return;
        }

        const parsed = ApproveSigninRequestModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        const repo = this.protogen.database.dataSource.getRepository(PasswordlessSignInRequest);

        const request = await repo.findOne({
          where: {
            signinKey: data.signinKey,
            expiresAt: MoreThan(new Date()),
            used: Equal(false),
            approvedBy: Equal(null),
          }
        });

        if (request == null) {
          res.status(404).send({ message: "Request not found, expired, used or not approved" });
          return;
        }

        request.approvedBy = req.auth.user;
        const updatedRequest = await repo.save(request);

        res.json({
          requestId: updatedRequest.uuid,
          signinKey: updatedRequest.signinKey,
          expiresAt: updatedRequest.expiresAt,
        });
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

export const ApproveSigninRequestModel = z.object({
  signinKey: z.string().length(8),
});

export const PasswordlessSignInRequestModel = z.object({
  requestId: z.string().uuid(),
  signinKey: z.string().length(8),
});
