import { z } from "zod";
import { boopProfileToDTO } from "../../../boop-sensor/BoopSensorManager";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { ActionType } from "../../../actions/ActionType";
import { BoopProfileAction } from "../../../boop-sensor/BoopProfileAction";
import { uuidv7 } from "uuidv7";
import { BoopProfile } from "../../../boop-sensor/BoopProfile";

export class BoopSensorRouter extends AbstractRouter {
  constructor(server: ProtogenWebServer) {
    super(server, "/boop-sensor");

    this.router.get("/", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Get boop sensor data"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json(this.protogen.boopSensorManager.data);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/profiles", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Get boop sensor profiles"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json(this.protogen.boopSensorManager.profiles.map(profile => boopProfileToDTO(profile)));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/profiles", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Create a new boop sensor profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = CreateNewProfileModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;

        const newProfile = new BoopProfile(
          uuidv7(),
          data.name,
          [],
          30,
        );

        this.protogen.boopSensorManager.profiles.push(newProfile);
        await this.protogen.boopSensorManager.saveProfile(newProfile);

        res.json(boopProfileToDTO(newProfile));

      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/profiles/active", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles/active'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Get boop sensor profiles"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "No active profile found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const active = this.protogen.boopSensorManager.activeProfile;
        if (active == null) {
          res.status(404).send({ message: "No active profile found" });
          return;
        }
        res.json(boopProfileToDTO(active));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/profiles/:profileId/activate", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles/:profileId/activate'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Activate profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const prodile = this.protogen.boopSensorManager.profiles.find(p => p.id === req.params.profileId);
        if (prodile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }
        await this.protogen.boopSensorManager.setActiveProfile(prodile);
        res.json(boopProfileToDTO(prodile));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/profiles/active", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles/active'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Disables the active profile"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "No active profile to deactivate" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        if (this.protogen.boopSensorManager.activeProfile == null) {
          res.status(404).send({ message: "No active profile found" });
          return;
        }

        await this.protogen.boopSensorManager.setActiveProfile(null);
        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.get("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles/{id}'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Get profile by id"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const profileId = req.params.id;
        const profile = this.protogen.boopSensorManager.profiles.find(p => p.id === profileId);
        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }
        res.json(boopProfileToDTO(profile));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles/{id}'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Update profile"

      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See console for more info" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = ProfileModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }
        const data = parsed.data;


        const profileId = req.params.id;
        const profile = this.protogen.boopSensorManager.profiles.find(p => p.id === profileId);
        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }

        profile.name = data.name;
        profile.resetsAfter = data.resetsAfter;

        profile.actions = profile.actions.filter(a => data.actions.some(a2 => a2.id == a.id));

        for (const actionData of data.actions) {
          let action: BoopProfileAction | null = null;
          if (actionData.id) {
            action = profile.actions.find(a => a.id === actionData.id) ?? null;
          }

          if (action == null) {
            action = new BoopProfileAction(
              uuidv7(),
              actionData.triggerAtValue,
              actionData.actionType,
              actionData.action,
              actionData.triggerMultipleTimes,
              actionData.incrementCounterOnFailedCondition
            );
            profile.actions.push(action);
          } else {
            action.triggerAtValue = actionData.triggerAtValue;
            action.actionType = actionData.actionType;
            action.action = actionData.action;
            action.triggerMultipleTimes = actionData.triggerMultipleTimes;
            action.incrementCounterOnFailedCondition = actionData.incrementCounterOnFailedCondition;
          }
        }

        await this.protogen.boopSensorManager.saveProfile(profile);

        res.json(boopProfileToDTO(profile));
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/profiles/:id", async (req, res) => {
      /*
      #swagger.path = '/boop-sensor/profiles/{id}'
      #swagger.tags = ['Boop sensor'],
      #swagger.description = "Update profile"

      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "Profile not found" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const profileId = req.params.id;
        const profile = this.protogen.boopSensorManager.profiles.find(p => p.id === profileId);
        if (profile == null) {
          res.status(404).send({ message: "Profile not found" });
          return;
        }

        await this.protogen.boopSensorManager.deleteProfile(profile);

        res.json({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const CreateNewProfileModel = z.object({
  name: z.string().max(64).trim().min(1),
});

const ProfileModel = z.object({
  name: z.string().max(64).trim().min(1),
  resetsAfter: z.number().int().min(1).safe(),
  actions: z.array(z.object({
    id: z.string().uuid().optional(),
    triggerAtValue: z.number().int().min(1).safe(),
    actionType: z.nativeEnum(ActionType),
    action: z.string().max(512),
    triggerMultipleTimes: z.boolean(),
    incrementCounterOnFailedCondition: z.boolean(),
  })),
});
