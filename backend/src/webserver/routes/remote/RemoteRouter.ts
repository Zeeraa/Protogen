import { RemoteProfile } from "../../../database/models/remote/RemoteProfile.model";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { z } from "zod";
import { Equal, Not } from "typeorm";
import { RemoteAction } from "../../../database/models/remote/RemoteAction.model";
import { RemoteControlActionType } from "../../../database/models/remote/RemoteControlActionType";
import { RemoteControlInputType } from "../../../database/models/remote/RemoteControlInputType";
import { SocketMessageType } from "../../socket/SocketMessageType";

export class RemoteRouter extends AbstractRouter {
  private sequenceIdMap: SequenceIdMap = {};

  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/remote");

    this.router.get("/config", async (req, res) => {
      /*
      #swagger.path = '/remote/config'
      #swagger.tags = ['Remote'],
      #swagger.description = "Get remote settings"
      #swagger.responses[200] = { description: "Ok" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      res.json({
        invertX: this.protogen.remoteManager.invertX,
        invertY: this.protogen.remoteManager.invertY,
        flipAxis: this.protogen.remoteManager.flipAxis,
      });
    });

    this.router.get("/config/full", async (req, res) => {
      /*
      #swagger.path = '/remote/config/full'
      #swagger.tags = ['Remote'],
      #swagger.description = "Get remote profiles and settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      const repo = this.protogen.database.dataSource.getRepository(RemoteProfile);
      const profiles = await repo.find({
        relations: {
          actions: true,
        },
      });

      res.json({
        profiles: profiles,
        invertX: this.protogen.remoteManager.invertX,
        invertY: this.protogen.remoteManager.invertY,
        flipAxis: this.protogen.remoteManager.flipAxis,
      });
    });

    this.router.put("/config", async (req, res) => {
      /*
      #swagger.path = '/remote/config'
      #swagger.tags = ['Remote'],
      #swagger.description = "Update remote settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = AlterSettingsDTO.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        if (data.invertX !== undefined) {
          this.protogen.remoteManager.invertX = data.invertX;
        }

        if (data.invertY !== undefined) {
          this.protogen.remoteManager.invertY = data.invertY;
        }

        if (data.flipAxis !== undefined) {
          this.protogen.remoteManager.flipAxis = data.flipAxis;
        }

        await this.protogen.remoteManager.saveConfig();

        const config = {
          invertX: this.protogen.remoteManager.invertX,
          invertY: this.protogen.remoteManager.invertY,
          flipAxis: this.protogen.remoteManager.flipAxis,
        }

        this.protogen.webServer.broadcastMessage(SocketMessageType.S2E_RemoteConfigChange, config);
        res.json(config);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/profiles/last-change", async (req, res) => {
      /*
      #swagger.path = '/remote/profiles/last-change'
      #swagger.tags = ['Remote'],
      #swagger.description = "Get the data when profiles where edited"
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
          select: {
            id: true,
            lastSaveDate: true,
          },
        });

        res.json(profiles);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

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
        profile.lastSaveDate = new Date();

        // Add / update actions
        data.actions.forEach(action => {
          const actionObj = new RemoteAction();

          actionObj.action = action.action;
          actionObj.actionType = action.actionType;
          actionObj.inputType = action.inputType;

          profile.actions.push(actionObj);
        });

        // Fill unspecified actions with null values
        Object.values(RemoteControlInputType).forEach(type => {
          if (profile.actions.find(a => a.inputType == type) == null) {
            const actionObj = new RemoteAction();

            actionObj.action = null;
            actionObj.actionType = RemoteControlActionType.NONE;
            actionObj.inputType = type;

            profile.actions.push(actionObj);
          }
        })

        const result = await repo.save(profile);

        this.protogen.webServer.broadcastMessage(SocketMessageType.S2E_RemoteProfileChange, { id: result.id });

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
        profile.lastSaveDate = new Date();

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
          actionObj.inputType = action.inputType;

          profile.actions.push(actionObj);
        });

        // Fill unspecified actions with null values
        Object.values(RemoteControlInputType).forEach(type => {
          if (profile.actions.find(a => a.inputType == type) == null) {
            const actionObj = new RemoteAction();

            actionObj.action = null;
            actionObj.actionType = RemoteControlActionType.NONE;
            actionObj.inputType = type;

            profile.actions.push(actionObj);
          }
        });

        const result = await repo.save(profile);

        this.protogen.webServer.broadcastMessage(SocketMessageType.S2E_RemoteProfileChange, { id: result.id });

        res.json(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/remote/profiles/{id}'
      #swagger.tags = ['Remote'],
      #swagger.description = "Delete a profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for more info" }
      #swagger.responses[404] = { description: "Profile not found" }
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

        await repo.delete(profile.id);

        this.protogen.webServer.broadcastMessage(SocketMessageType.S2E_RemoteConfigChange, config);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/perform-action", async (req, res) => {
      /*
      #swagger.path = '/remote/perform-action'
      #swagger.tags = ['Remote'],
      #swagger.description = "Performs and action based on input"
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
        const parsed = PerformActionDTO.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        if (data.sequenceId != null) {
          const last = this.sequenceIdMap[data.sessionId] || -1;
          if (data.sequenceId < last) {
            res.json({ status: false, sequenceFail: true });
            return;
          }
          this.sequenceIdMap[data.sessionId] = data.sequenceId;
        }

        const status = await this.protogen.remoteManager.performAction(data.type, data.action);

        if (status && data.type == RemoteControlActionType.ACTIVATE_VISOR_RENDERER) {
          // If a video is playing stop playback
          this.protogen.videoPlaybackManager.kill(false);
        }

        res.json({ status, sequenceFail: false });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

type SequenceIdMap = {
  [key: string]: number;
}

const PerformActionDTO = z.object({
  type: z.nativeEnum(RemoteControlActionType),
  action: z.string().max(512).nullable(),
  sessionId: z.string().uuid(),
  sequenceId: z.number().int().safe().optional(),
});

const AlterProfileActions = z.object({
  id: z.number().int().safe().positive().optional(),
  actionType: z.nativeEnum(RemoteControlActionType),
  action: z.string().max(512).nullable(),
  inputType: z.nativeEnum(RemoteControlInputType),
});

const AlterProfileModel = z.object({
  name: z.string().trim().min(1).max(16),
  actions: z.array(AlterProfileActions),
  clickToActivate: z.boolean(),
})

const AlterSettingsDTO = z.object({
  invertX: z.boolean().optional(),
  invertY: z.boolean().optional(),
  flipAxis: z.boolean().optional(),
})
