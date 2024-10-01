import morgan from "morgan";
import bodyParser from "body-parser";
import cors from 'cors';
import https from 'https';
import swaggerUi from "swagger-ui-express";
import express from "express";

import * as helmet from "helmet";

import { Express, Request, Response } from "express";
import { Configuration } from "./configuration/Configuration";
import { ExitCodes } from "./enum/ExitCodes";
import { cyan, green, red, yellow } from "colors";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { VideoDownloaderRouter } from "./routes/video_downloader/VideoDownloaderRouter";
import { VideoDownloadManager } from "./video_downloader/VideoDownloaderManager";

export class Server {
    private _configuration;
    private _express: Express;
    private _videoDownloadManager: VideoDownloadManager;
    private _dataDirectory: string;

    constructor(config: Configuration) {
        this._configuration = config;

        this._dataDirectory = "./data";
        if (!existsSync(this.dataDirectory)) {
            mkdirSync(this.dataDirectory);
        }

        this._videoDownloadManager = new VideoDownloadManager(this);

        //#region Express and middleware
        this._express = express();
        this._express.use(cors());
        this._express.use(bodyParser.json());
        this._express.use(helmet.hidePoweredBy());
        this._express.use(morgan("combined"));
        if (String(process.env["TRUST_PROXY"]).toLowerCase() == "true") {
            this._express.set('trust proxy', true);
        }
        //#endregion

        this.init().then(() => {
            console.log(green("Ready"));

            // Register swagger last so that it does not overwrite our endpoints
            //#region Swagger
            if (existsSync("./swagger.json")) { // Path is relative to where the npm command runns from here
                const swaggerOutput = require("../swagger.json"); // But relative to the Server.ts file here
                this._express.use("/", swaggerUi.serve, swaggerUi.setup(swaggerOutput));
            } else {
                console.error(red("Could not find swagger.json. Make sure to run \"npm run swagger\" before starting the server"));
                console.warn(yellow("Swagger documentation will not be available until this is resolved"));
                this._express.get("/", (_: Request, res: Response) => {
                    res.send("Could not find swagger.json. Make sure to run \"npm run swagger\" before starting the server");
                });
            }
            //#endregion
        }).catch(err => {
            console.error(red("An error occured while starting server"), err);
            process.exit(ExitCodes.INIT_FAILED);
        });
    }

    private async init() {
        await this._videoDownloadManager.init();

        //#region Register endpoints
        new VideoDownloaderRouter(this).register();
        //#endregion

        await this.startExpress();
    }

    //#region Start express
    private startExpress() {
        return new Promise<void>((resolve, reject) => {
            try {
                if (this.configuration.web.sslKeyPath != null) {
                    console.log("Using HTTPS");
                    console.log("Reading private key...");
                    const privateKey = readFileSync(this.configuration.web.sslKeyPath!, 'utf8');
                    console.log("Reading certificate...");
                    const certificate = readFileSync(this.configuration.web.sslCertPath!, 'utf8');
                    const credentials = { key: privateKey, cert: certificate };
                    const httpsServer = https.createServer(credentials, this._express);
                    httpsServer.listen(this.configuration.web.port, () => {
                        console.log(green("HTTPS listening on port:"), cyan(String(this.configuration.web.port)));
                        resolve();
                    });
                } else {
                    console.log("Using HTTP");
                    this._express.listen(this.configuration.web.port, () => {
                        console.log(green("Express listening on port:"), cyan(String(this.configuration.web.port)));
                        resolve();
                    });
                }
            } catch (err) {
                console.error(red("An error occured while starting express"));
                reject(err);
            }
        });
    }
    //#endregion

    //#region Getters
    get configuration() {
        return this._configuration;
    }

    get express() {
        return this._express;
    }

    get dataDirectory() {
        return this._dataDirectory;
    }

    get videoDownloadManager() {
        return this._videoDownloadManager;
    }
    //#endregion
}
