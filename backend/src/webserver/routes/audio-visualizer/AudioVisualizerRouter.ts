import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class AudioVisualiserRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/audio-visualizer");

    this.router.get("/settings", async (_, res) => {
      /*
      #swagger.path = '/audio-visualizer/settings'
      #swagger.tags = ['Audio Visualizer'],
      #swagger.description = "Get audio visualizer settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      res.json({
        lowThreshold: this.protogen.audioVisualiser.lowThreshold,
        highThreshold: this.protogen.audioVisualiser.highThreshold,
        rawAmplification: this.protogen.audioVisualiser.rawAmplification,
      });
    });

    this.router.put("/settings", async (req, res) => {
      /*
      #swagger.path = '/audio-visualizer/settings'
      #swagger.tags = ['Audio Visualizer'],
      #swagger.description = "Update audio visualizer settings"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[500] = { description: "An internal error occured" }

      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = AlterAudioVisualizerSettingsModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;


        this.protogen.audioVisualiser.rawAmplification = data.rawAmplification;
        this.protogen.audioVisualiser.lowThreshold = data.lowThreshold;
        this.protogen.audioVisualiser.highThreshold = data.highThreshold;

        await this.protogen.audioVisualiser.saveSettings();

        res.json({
          lowThreshold: this.protogen.audioVisualiser.lowThreshold,
          highThreshold: this.protogen.audioVisualiser.highThreshold,
          rawAmplification: this.protogen.audioVisualiser.rawAmplification,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const AlterAudioVisualizerSettingsModel = z.object({
  rawAmplification: z.number().min(0).max(100),
  lowThreshold: z.number().min(0).max(100),
  highThreshold: z.number().min(0).max(100)
});
