import { throws } from "assert";
import { RemoteProfile } from "../../../database/models/remote/RemoteProfile.model";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { z } from "zod";
import { RemoteControlActionType } from "../../../database/models/remote/RemoteControlActionType";
import { Equal, Not } from "typeorm";
import { RemoteAction } from "../../../database/models/remote/RemoteAction.model";

export class RemoteRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/remote");

    this.router.get("/profiles", async (req, res) => {
      /*
      #swagger.path = '/remote/profiles'
      #swagger.tags = ['Remote'],
      #swagger.description = "Get all configure remote profiles"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const repo = this.protogen.database.dataSource.getRepository(RemoteProfile);
        const profiles = await repo.find({
          relations: {
            actions: true,
          },
        });

        res.json(profiles);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/profiles", async (req, res) => {
      /*
      #swagger.path = '/remote/profiles'
      #swagger.tags = ['Remote'],
      #swagger.description = "Create a new profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }
      #swagger.responses[409] = { description: "There is already another profile with this name" }
      #swagger.responses[500] = { description: "An internal error occured" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = AlterProfileModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        const repo = this.protogen.database.dataSource.getRepository(RemoteProfile);

        const existing = await repo.findOne({
          where: {
            name: Equal(data.name)
          }
        });

        if (existing != null) {
          res.status(409).send({ message: "Profile name already in use" });
          return;
        }

        const profile = new RemoteProfile();
        profile.name = data.name.trim();
        profile.actions = [];
        profile.clickToActivate = data.clickToActivate;

        // Add / update actions
        data.actions.forEach(action => {
          const actionObj = new RemoteAction();

          actionObj.action = action.action;
          actionObj.actionType = action.actionType;

          profile.actions.push(actionObj);
        });

        // Fill unspecified actions with null values
        Object.values(RemoteControlActionType).forEach(type => {
          if (profile.actions.find(a => a.actionType == type) == null) {
            const actionObj = new RemoteAction();

            actionObj.action = null;
            actionObj.actionType = type;

            profile.actions.push(actionObj);
          }
        })

        const result = await repo.save(profile);
        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/remote/profiles/{id}'
      #swagger.tags = ['Remote'],
      #swagger.description = "Alter an existing profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[409] = { description: "There is already another profile with this name" }
      #swagger.responses[500] = { description: "An internal error occured" }
      
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
          res.status(400).send({ message: "Invalid id provided" });
          return;
        }

        const parsed = AlterProfileModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        const repo = this.protogen.database.dataSource.getRepository(RemoteProfile);

        const profile = await repo.findOne({
          where: {
            id: Equal(id),
          },
          relations: {
            actions: true,
          },
        });

        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }

        const conflict = await repo.findOne({
          where: {
            name: Equal(data.name),
            id: Not(Equal(profile.id)),
          },
        });

        if (conflict != null) {
          res.status(409).send({ message: "Profile name already in use by other profile" });
          return;
        }

        const oldActions = profile.actions;

        profile.name = data.name;
        profile.clickToActivate = data.clickToActivate;
        profile.actions = [];

        // Add / update actions
        data.actions.forEach(action => {
          const actionObj = new RemoteAction();

          if (action.id != null) {
            const existing = oldActions.find(a => a.id == action.id);
            if (existing != null) {
              actionObj.id = action.id;
            }
          }

          actionObj.action = action.action;
          actionObj.actionType = action.actionType;

          profile.actions.push(actionObj);
        });

        // Fill unspecified actions with null values
        Object.values(RemoteControlActionType).forEach(type => {
          if (profile.actions.find(a => a.actionType == type) == null) {
            const actionObj = new RemoteAction();

            actionObj.action = null;
            actionObj.actionType = type;

            profile.actions.push(actionObj);
          }
        });

        const result = await repo.save(profile);

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const AlterProfileActions = z.object({
  id: z.number().int().safe().positive().optional(),
  action: z.string().max(512).nullable(),
  actionType: z.nativeEnum(RemoteControlActionType),
});

const AlterProfileModel = z.object({
  name: z.string().trim().min(1).max(16),
  actions: z.array(AlterProfileActions),
  clickToActivate: z.boolean(),
})