import mqtt from "mqtt";
import { Protogen } from "../Protogen";
import { MqttConfiguration } from "../config/objects/MqttConfiguration";

export class MqttManager {
  private readonly _protogen: Protogen;
  private readonly _config: MqttConfiguration;
  private _client: mqtt.MqttClient | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._config = protogen.config.mqtt;
  }

  public async init(): Promise<void> {
    const url = `mqtt://${this._config.host}:${this._config.port}`;
    this._protogen.logger.info("MqttManager", "Connecting to MQTT broker at " + url);

    return new Promise<void>((resolve, reject) => {
      this._client = mqtt.connect(url, {
        clientId: "protogen_backend",
        reconnectPeriod: 5000,
      });

      this._client.on("connect", () => {
        this._protogen.logger.info("MqttManager", "Connected to MQTT broker");
        resolve();
      });

      this._client.on("error", (err) => {
        this._protogen.logger.error("MqttManager", "MQTT error: " + err.message);
        reject(err);
      });

      this._client.on("reconnect", () => {
        this._protogen.logger.info("MqttManager", "Reconnecting to MQTT broker...");
      });
    });
  }

  public subscribe(topic: string, callback: (topic: string, message: Buffer) => void): void {
    if (!this._client) {
      throw new Error("MQTT client not initialized");
    }
    this._client.subscribe(topic, (err) => {
      if (err) {
        this._protogen.logger.error("MqttManager", "Failed to subscribe to " + topic + ": " + err.message);
      }
    });
    this._client.on("message", (t, msg) => {
      if (t === topic || this._topicMatches(topic, t)) {
        callback(t, msg);
      }
    });
  }

  public publish(topic: string, message: string, options?: mqtt.IClientPublishOptions): void {
    if (!this._client) {
      throw new Error("MQTT client not initialized");
    }
    this._client.publish(topic, message, options || {});
  }

  public get client(): mqtt.MqttClient | null {
    return this._client;
  }

  private _topicMatches(filter: string, topic: string): boolean {
    const filterParts = filter.split("/");
    const topicParts = topic.split("/");

    for (let i = 0; i < filterParts.length; i++) {
      if (filterParts[i] === "#") return true;
      if (filterParts[i] === "+") continue;
      if (filterParts[i] !== topicParts[i]) return false;
    }

    return filterParts.length === topicParts.length;
  }
}
