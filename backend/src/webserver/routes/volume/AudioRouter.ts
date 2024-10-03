import { z } from "zod";
import { getVolume, setVolume } from "../../../utils/VolumeUtils";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class AudioRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/audio");

    this.router.get("/volume", async (req, res) => {
      /*
      #swagger.path = '/audio/volume'
      #swagger.tags = ['Audio'],
      #swagger.description = "Get the volume"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "Failed to get volume" }
      */
      try {
        const volume = await getVolume();
        res.json({
          volume: volume
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/volume", async (req, res) => {
      /*
      #swagger.path = '/audio/volume'
      #swagger.tags = ['Audio'],
      #swagger.description = "Set the volume"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[500] = { description: "Failed to set volume" }

      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Set the volume',
        schema: {
          volume: 50
        }
      }
      */
      try {
        const parsed = SetVolumeDTO.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        await setVolume(data.volume);
        const newVolume = await getVolume();

        res.json({
          volume: newVolume
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const SetVolumeDTO = z.object({
  volume: z.number().min(0).max(100).int(),
});