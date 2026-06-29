import { GamepadType } from "../../../gamepadmanager/GamepadManager";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { z } from "zod";
import { GamepadActionTriggers } from "../../../gamepadmanager/GamepadState";
import { ActionType } from "../../../actions/ActionType";
import { GamepadProfileAction } from "../../../database/models/gamepad/GamepadProfileAction.model";
import { GamepadProfile } from "../../../database/models/gamepad/GamepadProfile.model";
import { uuidv7 } from "uuidv7";

export class GamepadRouter extends AbstractRouter {
  constructor(server: ProtogenWebServer) {
    super(server, "/gamepad");

    this.router.get("/state", async (req, res) => {
      /*
      #swagger.path = '/gamepad/state'
      #swagger.tags = ['Gamepad'],
      #swagger.description = "Get gamepad state"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json(this.protogen.gamepadManager.state);
      } catch (err) {
        this.handleError(err, req, res)
      }
    })

    this.router.get("/settings", async (req, res) => {
      /*
      #swagger.path = '/gamepad/settings'
      #swagger.tags = ['Gamepad'],
      #swagger.description = "Get gamepad settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json({
          type: this.protogen.gamepadManager.type,
          enablePreview: this.protogen.gamepadManager.enablePreview,
        });
      } catch (err) {
        this.handleError(err, req, res)
      }
    });

    this.router.post("/settings", async (req, res) => {
      /*
      #swagger.path = '/gamepad/settings'
      #swagger.tags = ['Gamepad'],
      #swagger.description = "Set gamepad settings"

      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = GamepadSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        await Promise.all([
          this.protogen.gamepadManager.setTypePersistently(data.type),
          this.protogen.gamepadManager.setEnablePreviewPersistently(data.enablePreview),
        ]);

        res.json({ type: data.type, enablePreview: data.enablePreview });
      } catch (err) {
        this.handleError(err, req, res)
      }
    });

    this.router.post("/restart-listener", async (req, res) => {
      /*
      #swagger.path = '/gamepad/restart-listener'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Restart the gamepad listener service"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        await this.protogen.gamepadManager.restartGamepadListenerService();
        res.json({ message: "Gamepad listener restarted" });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/profiles", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Get all gamepad profiles"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const scenes = this.protogen.gamepadManager.profiles;
        res.json(scenes.map(p => profileToDTO(p)));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/profiles", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Create a new gamepad profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[409] = { description: "A profile with this name already exists" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = CreateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const { name } = parsed.data;

        const conflict = this.protogen.gamepadManager.profiles.find(p => p.name === name);
        if (conflict != null) {
          res.status(409).send({ message: "A profile with this name already exists" });
          return;
        }

        const saved = await this.protogen.gamepadManager.createProfile(name);
        res.json(profileToDTO(saved));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    // /profiles/active routes must come before /profiles/:id to avoid route conflicts
    this.router.get("/profiles/active", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles/active'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Get the active gamepad profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "No active profile set" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const active = this.protogen.gamepadManager.activeProfile;
        if (active == null) {
          res.status(404).send({ message: "No active profile set" });
          return;
        }
        res.json(profileToDTO(active));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/profiles/active", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles/active'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Unset the active gamepad profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        await this.protogen.gamepadManager.setActiveProfile(null);
        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/profiles/:id/activate", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles/{id}/activate'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Set the active gamepad profile"
      #swagger.parameters['id'] = { in: 'path', description: 'Profile ID', required: true, type: 'string' }
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const profile = this.protogen.gamepadManager.profiles.find(p => p.id === req.params.id);
        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }

        await this.protogen.gamepadManager.setActiveProfile(profile);
        res.json(profileToDTO(profile));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles/{id}'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Get a gamepad profile by ID"
      #swagger.parameters['id'] = { in: 'path', description: 'Profile ID', required: true, type: 'string' }
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const profile = this.protogen.gamepadManager.profiles.find(p => p.id === req.params.id);
        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }
        res.json(profileToDTO(profile));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles/{id}'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Update a gamepad profile"
      #swagger.parameters['id'] = { in: 'path', description: 'Profile ID', required: true, type: 'string' }
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[409] = { description: "A profile with this name already exists" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = UpdateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const profile = this.protogen.gamepadManager.profiles.find(p => p.id === req.params.id);
        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }

        const { name, actions } = parsed.data;
        if (name !== profile.name) {
          const conflict = this.protogen.gamepadManager.profiles.find(p => p.name === name && p.id !== req.params.id);
          if (conflict != null) {
            res.status(409).send({ message: "A profile with this name already exists" });
            return;
          }
        }

        profile.name = name;

        // Replace all actions for this profile
        await this.protogen.database.dataSource
          .createQueryBuilder()
          .delete()
          .from(GamepadProfileAction)
          .where("profile_id = :id", { id: profile.id })
          .execute();

        profile.actions = actions.map(a => {
          const action = new GamepadProfileAction();
          action.id = uuidv7();
          action.profile = profile;
          action.trigger = a.trigger;
          action.actionType = a.actionType;
          action.action = a.action;
          return action;
        });

        const saved = await this.protogen.gamepadManager.saveProfile(profile);
        res.json(profileToDTO(saved));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/gamepad/profiles/{id}'
      #swagger.tags = ['Gamepad']
      #swagger.description = "Delete a gamepad profile"
      #swagger.parameters['id'] = { in: 'path', description: 'Profile ID', required: true, type: 'string' }
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const profile = this.protogen.gamepadManager.profiles.find(p => p.id === req.params.id);
        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }

        await this.protogen.gamepadManager.deleteProfile(profile);
        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const GamepadSettingsSchema = z.object({
  type: z.nativeEnum(GamepadType),
  enablePreview: z.boolean(),
});

const CreateProfileSchema = z.object({
  name: z.string().max(64).trim().min(1),
});

const ActionItemSchema = z.object({
  trigger: z.nativeEnum(GamepadActionTriggers),
  actionType: z.nativeEnum(ActionType),
  action: z.string().max(512).nullable(),
});

const UpdateProfileSchema = z.object({
  name: z.string().max(64).trim().min(1),
  actions: z.array(ActionItemSchema),
});

function profileToDTO(profile: GamepadProfile) {
  return {
    id: profile.id,
    name: profile.name,
    actions: (profile.actions ?? []).map(a => ({
      id: a.id,
      trigger: a.trigger,
      actionType: a.actionType,
      action: a.action,
    })),
  };
}