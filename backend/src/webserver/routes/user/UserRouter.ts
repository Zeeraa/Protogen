import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

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
  }
}