import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { typeAssert } from "../../../utils/Utils";

export class UserRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/users");

    this.router.get("/", async (req, res) => {
      /*
      #swagger.path = '/users'
      #swagger.tags = ['Users'],
      #swagger.description = "Get all users"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An error occured while gathering information" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const users = await this.protogen.userManager.getAllUsers();

        users.forEach((u: any) => {
          delete u.password;
        });

        res.send(users);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/", async (req, res) => {
      /*
      #swagger.path = '/users'
      #swagger.tags = ['Users'],
      #swagger.description = "Create a new user"
      #swagger.responses[200] = { description: "User created" }
      #swagger.responses[403] = { description: "Missing permissions to create new user" }
      #swagger.responses[403] = { description: "Username is already taken" }
      #swagger.responses[500] = { description: "An error occured while gathering information" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        if (!req.auth.isSuperUser) {
          res.status(403).send({ message: "Access denied" });
          return;
        }

        const parsed = CreateUserModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const user = await this.protogen.userManager.createUser(data.username, data.password, data.superUser);
        if (user == null) {
          res.status(409).send({ message: "Username is already taken" });
          return;
        }

        delete (user as any).password;

        res.json(user);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/:userId/password", async (req, res) => {
      /*
      #swagger.path = '/users/{userId}'
      #swagger.tags = ['Users'],
      #swagger.description = "Change the password of a user"
      #swagger.responses[200] = { description: "User password changed" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[403] = { description: "Missing required permissions to alter other users password" }
      #swagger.responses[404] = { description: "User not found" }
      #swagger.responses[500] = { description: "An error occured while gathering information" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = ChangePasswordModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const id = parseInt(req.params.userId);

        if (isNaN(id)) {
          res.status(400).send({ message: "Invalid id provided" });
          return;
        }

        const user = await this.protogen.userManager.getUserById(id);

        if (user == null) {
          res.status(404).send({ message: "User not found" });
          return;
        }

        if ((req.auth.user == null || req.auth.user.id != user.id) && !req.auth.isSuperUser) {
          res.status(403).send({ message: "Missing required permissions to alter other users password" });
          return;
        }

        const changedUser = await this.protogen.userManager.changePassword(user.id, data.password);

        delete (changedUser as any).password;

        res.json(changedUser);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/:userId", async (req, res) => {
      /*
      #swagger.path = '/users/{userId}'
      #swagger.tags = ['Users'],
      #swagger.description = "Delete a user"
      #swagger.responses[200] = { description: "User deleted" }
      #swagger.responses[400] = { description: "Invalid id provided" }
      #swagger.responses[403] = { description: "Missing permissions to create new user" }
      #swagger.responses[404] = { description: "User not found" }
      #swagger.responses[500] = { description: "An error occured while gathering information" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        if (!req.auth.isSuperUser) {
          res.status(403).send({ message: "Access denied" });
          return;
        }

        const id = parseInt(req.params.userId);

        if (isNaN(id)) {
          res.status(400).send({ message: "Invalid id provided" });
          return;
        }

        const user = await this.protogen.userManager.getUserById(id);

        if (user == null) {
          res.status(404).send({ message: "User not found" });
          return;
        }

        await this.protogen.userManager.deleteUser(user.id);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const CreateUserModel = z.object({
  username: z.string().trim().min(1).max(32),
  password: z.string().min(1),
  superUser: z.boolean(),
});

const ChangePasswordModel = z.object({
  password: z.string().min(1),
});