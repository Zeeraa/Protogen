import { z } from "zod";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";

export class AudioVisualiserRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/audio-visualizer");

    // Get current config
    this.router.get("/config", async (_, res) => {
      /*
      #swagger.path = '/audio-visualizer/config'
      #swagger.tags = ['Audio Visualizer']
      #swagger.description = "Get audio visualizer configuration"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occurred" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        res.json({
          config: this.protogen.audioVisualiser.config,
          isRunning: this.protogen.audioVisualiser.isRunning,
          refreshRate: this.protogen.rgb?.refreshRate ?? 30,
        });
      } catch (err) {
        this.handleError(err, _, res);
      }
    });

    // Update config
    this.router.put("/config", async (req, res) => {
      /*
      #swagger.path = '/audio-visualizer/config'
      #swagger.tags = ['Audio Visualizer']
      #swagger.description = "Update audio visualizer configuration"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[500] = { description: "An internal error occurred" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const parsed = UpdateConfigModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ message: "Bad request", issues: parsed.error.issues });
          return;
        }

        const data: any = { ...parsed.data };
        if (data.sensitivity !== undefined && data.intensity === undefined) {
          data.intensity = data.sensitivity;
        }

        await this.protogen.audioVisualiser.updateConfig(data);

        res.json({
          config: this.protogen.audioVisualiser.config,
          isRunning: this.protogen.audioVisualiser.isRunning,
          refreshRate: this.protogen.rgb?.refreshRate ?? 30,
        });
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    // Start audio visualizer
    this.router.post("/start", async (_, res) => {
      /*
      #swagger.path = '/audio-visualizer/start'
      #swagger.tags = ['Audio Visualizer']
      #swagger.description = "Start the audio visualizer"
      #swagger.responses[200] = { description: "Started successfully" }
      #swagger.responses[500] = { description: "An internal error occurred" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        await this.protogen.audioVisualiser.start();
        res.json({
          message: "Audio visualizer started",
          isRunning: this.protogen.audioVisualiser.isRunning,
        });
      } catch (err) {
        this.handleError(err, _, res);
      }
    });

    // Stop audio visualizer
    this.router.post("/stop", async (_, res) => {
      /*
      #swagger.path = '/audio-visualizer/stop'
      #swagger.tags = ['Audio Visualizer']
      #swagger.description = "Stop the audio visualizer"
      #swagger.responses[200] = { description: "Stopped successfully" }
      #swagger.responses[500] = { description: "An internal error occurred" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        await this.protogen.audioVisualiser.stop();
        res.json({
          message: "Audio visualizer stopped",
          isRunning: this.protogen.audioVisualiser.isRunning,
        });
      } catch (err) {
        this.handleError(err, _, res);
      }
    });

    // Get latest audio data
    this.router.get("/data", async (_, res) => {
      /*
      #swagger.path = '/audio-visualizer/data'
      #swagger.tags = ['Audio Visualizer']
      #swagger.description = "Get latest audio visualization data"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[404] = { description: "No data available" }
      #swagger.responses[500] = { description: "An internal error occurred" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const data = this.protogen.audioVisualiser.latestData;
        if (!data) {
          res.status(404).json({ message: "No audio data available" });
          return;
        }
        res.json(data);
      } catch (err) {
        this.handleError(err, _, res);
      }
    });

    // List available audio devices
    this.router.get("/devices", async (_, res) => {
      /*
      #swagger.path = '/audio-visualizer/devices'
      #swagger.tags = ['Audio Visualizer']
      #swagger.description = "List available audio input devices"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[500] = { description: "An internal error occurred" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        const devices = await this.protogen.audioVisualiser.listAudioDevices();
        res.json({ devices });
      } catch (err) {
        this.handleError(err, _, res);
      }
    });
  }
}

const UpdateConfigModel = z.object({
  deviceIndex: z.number().nullable().optional(),
  lowThreshold: z.number().min(0.0).max(1.0).optional(),
  intensity: z.number().min(0.1).max(20.0).optional(),
  sensitivity: z.number().min(0.1).max(20.0).optional(),
  enabled: z.boolean().optional(),
});
