import { existsSync } from "fs";
import { validateConfNumberOrThrow, validatePort } from "./validators/ConfigValidators";

export async function loadConfiguration(): Promise<Configuration> {
    //#region Web server port and cert
    const port = parseInt(process.env["PORT"] || "80");
    if (isNaN(port)) {
        throw new Error("Config: PORT is not a valid number");
    }

    if (!validatePort(port)) {
        throw new Error("Config: PORT is not a valid port");
    }

    const trustProxy = String(process.env["TRUST_PROXY"]).toLowerCase() == "true"

    let apiKey: string | null = null;
    if (process.env["API_KEY"] != null) {
        apiKey = process.env["API_KEY"];
        if (apiKey.trim().length == 0) {
            apiKey = null;
        }
    }

    let sslKey: null | string = null;
    let sslCert: null | string = null;
    if (process.env["SSL_KEY"] != null || process.env["SSL_CERT"] != null) {
        sslKey = process.env["SSL_KEY"] as string;
        sslCert = process.env["SSL_CERT"] as string;

        if (sslKey == null) {
            throw new Error("Config: SSL_CERT is configured but SSL_KEY is missing. Either add SSL_KEY or remove SSL_CERT");
        }

        if (sslCert == null) {
            throw new Error("Config: SSL_KEY is configured but SSL_CERT is missing. Either add SSL_CERT or remove SSL_KEY");
        }

        if (!existsSync(sslKey)) {
            throw new Error("SSL key file at path \"" + sslKey + "\" could not be found");
        }

        if (!existsSync(sslCert)) {
            throw new Error("SSL cert file at path \"" + sslCert + "\" could not be found");
        }
    }

    const webConfig: WebConfig = {
        port: port,
        sslKeyPath: sslKey,
        sslCertPath: sslCert,
        trustProxy: trustProxy,
    }
    //#endregion

    return {
        web: webConfig,
        apiKey: apiKey,
    }
}

export interface Configuration {
    web: WebConfig;
    apiKey: string | null;
}

export interface WebConfig {
    port: number;
    sslKeyPath: string | null;
    sslCertPath: string | null;
    trustProxy: boolean;
}
