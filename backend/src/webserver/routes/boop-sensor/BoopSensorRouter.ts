import { boopProfileToDTO } from "../../../boop-sensor/BoopSensorManager";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class BoopSensorRouter extends AbstractRouter {
  constructor(server: ProtogenWebServer) {
    super(server, "/boop-sensor");

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
  }
}
