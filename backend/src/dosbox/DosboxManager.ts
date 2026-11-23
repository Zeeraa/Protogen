import { resolve } from "path";
import { Protogen } from "../Protogen";
import { DosboxApplication } from "./DosboxApplication";
import { existsSync, mkdirSync } from "fs";
import { DosboxApplicationType } from "./DosboxApplicationType";
import { spawn } from "child_process";
import { getErrorMessage, sleep } from "../utils/Utils";
import { WrappedDosboxApp } from "../apps/dosbox/WrappedDosboxApp";

const Framerate = 20;
const XvfbWidth = 1024;
const XvfbHeight = 768;

export class DosboxManager {
  private readonly protogen: Protogen;
  public readonly cDrivePath: string;
  private _runningApplication: DosboxApplication | null = null;
  private _dosboxProcess: ReturnType<typeof spawn> | null = null;
  private _ffmpegProcess: ReturnType<typeof spawn> | null = null;
  private _xvfbProcess: ReturnType<typeof spawn> | null = null;
  private _dosboxApplications: DosboxApplication[] = [];
  private _exitCallbackHandler: (() => void) | null = null;
  private _frameBuffer: Buffer | null = null;

  constructor(protogen: Protogen) {
    this.protogen = protogen;
    this.cDrivePath = resolve(protogen.config.dataDirectory + "/dosbox/c")

    if (!existsSync(this.cDrivePath)) {
      mkdirSync(this.cDrivePath, { recursive: true });
    }

    this.clearFrameBuffer();
  }

  public clearFrameBuffer() {
    const { width, height } = this.protogen.config.ledMatrix;
    // Generate black frame buffer
    this._frameBuffer = Buffer.alloc(width * height * 3, 0); // Assuming 3 bytes per pixel (RGB)
  }

  public get frameBuffer() {
    return this._frameBuffer;
  }

  public async loadApplications() {
    this._dosboxApplications = [];
    this._dosboxApplications.push(new DosboxApplication(this, DosboxApplicationType.SystemApp, "dosbox", null, "DOSBox", []));
    this.registerApplicationWrappers();
  }

  public async registerApplicationWrappers() {
    // Get list of all existing apps since we need to unregister them
    const allApplicationWrappers = [...this.protogen.appManager.apps]
      .filter(app => app instanceof WrappedDosboxApp);

    allApplicationWrappers.forEach(app => {
      this.protogen.appManager.unregisterApp(app);
    });

    // Construct wrappers
    this._dosboxApplications.forEach(dosboxApp => {
      const wrapper = new WrappedDosboxApp(this.protogen.appManager, dosboxApp);
      this.protogen.appManager.registerApp(wrapper);
    });
  }

  public get dosboxApplications() {
    return this._dosboxApplications;
  }

  private runExitCallbackHandler() {
    try {
      this._exitCallbackHandler?.();
    } catch (error) {
      console.error(error);
      this.protogen.logger.error("DosboxManager", "Error running exit callback handler: " + getErrorMessage(error));
    }
  }

  public kill(): boolean {
    const dosboxProcess = this._dosboxProcess;
    const ffmpegProcess = this._ffmpegProcess;
    const xvfbProcess = this._xvfbProcess;
    if (dosboxProcess || ffmpegProcess || xvfbProcess) {
      this.protogen.logger.info("DosboxManager", "Killing DOSBox process");
      this._runningApplication = null;
      this._dosboxProcess = null;
      this._xvfbProcess = null;
      this._ffmpegProcess = null;
      dosboxProcess?.kill();
      ffmpegProcess?.kill();
      xvfbProcess?.kill();
      return true;
    }
    return false;
  }

  public async launch(dosboxApp: DosboxApplication, maintenanceMode: boolean) {
    const { width, height } = this.protogen.config.ledMatrix;
    const panelWidth = width / 2;

    try {
      // First start xvfb
      this._xvfbProcess = spawn("Xvfb", [":99", "-screen", "0", `${XvfbWidth}x${XvfbHeight}x16`], { stdio: ["ignore", "inherit", "inherit"] });
      await sleep(500);

      const frameSize = panelWidth * height * 3;
      let nextFrameBuffer: Buffer = Buffer.alloc(frameSize);
      let nextFrameOffset = 0;
      this._ffmpegProcess = spawn("ffmpeg", [
        "-loglevel", "error",
        "-nostats",
        "-f", "x11grab",
        "-framerate", String(Framerate),
        "-video_size", `${XvfbWidth}x${XvfbHeight}`,
        "-i", ":99",
        "-vf", `scale=${panelWidth}:${height}:force_original_aspect_ratio=disable,setsar=1`,
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "pipe:1",
      ], { stdio: ["ignore", "pipe", "inherit"] });
      const ffmpegProcess = this._ffmpegProcess;

      ffmpegProcess.stdout?.on("data", (chunk: Buffer) => {
        let chunkOffset = 0;
        while (chunkOffset < chunk.length) {
          const bytesToCopy = Math.min(frameSize - nextFrameOffset, chunk.length - chunkOffset);
          chunk.copy(nextFrameBuffer, nextFrameOffset, chunkOffset, chunkOffset + bytesToCopy);
          nextFrameOffset += bytesToCopy;
          chunkOffset += bytesToCopy;

          if (nextFrameOffset === frameSize) {
            const previousFrameBuffer = this._frameBuffer;
            this._frameBuffer = nextFrameBuffer;
            nextFrameBuffer = previousFrameBuffer ?? Buffer.alloc(frameSize);
            nextFrameOffset = 0;
          }
        }
      });

      ffmpegProcess.on("error", error => {
        this.protogen.logger.error("DosboxManager", "FFmpeg process error: " + getErrorMessage(error));
        this.clearFrameBuffer();
        if (this._ffmpegProcess === ffmpegProcess) {
          this.kill();
        }
      });
      ffmpegProcess.on("exit", () => {
        this.clearFrameBuffer();
        if (this._ffmpegProcess === ffmpegProcess) {
          this.kill();
        }
      });

      const commandlineFull: string[] = [];

      commandlineFull.push(...dosboxApp.generateCommandLine(!maintenanceMode));

      this._runningApplication = dosboxApp;
      const commandlineForLog = commandlineFull
        .map(argument => argument.includes(" ") ? JSON.stringify(argument) : argument)
        .join(" ");
      this.protogen.logger.info("DosboxManager", "Launching DOSBox application: " + dosboxApp.name + ". Commandline: " + commandlineForLog);
      this._dosboxProcess = spawn("dosbox", commandlineFull, {
        stdio: ["ignore", "inherit", "inherit"],
        env: { ...process.env, DISPLAY: ":99" },
      });

      this._dosboxProcess.on("exit", () => {
        this._runningApplication = null;
        this._dosboxProcess = null;
        this._xvfbProcess?.kill();
        this._xvfbProcess = null;
        this.runExitCallbackHandler();
      });

    } catch (error) {
      this.kill();
      this._runningApplication = null;
      this.protogen.logger.error("DosboxManager", "Error launching DOSBox application: " + getErrorMessage(error));
      throw error;
    }
  }

  public setExitCallbackHandler(callback: () => void) {
    this._exitCallbackHandler = callback;
  }

  public get runningApplication() {
    return this._runningApplication;
  }
}
