import Redis from "ioredis";
import { Protogen } from "../Protogen";
import { cyan } from "colors";

const AudioChannel = "audio_channel";
const Channels = [AudioChannel];

export class RedisManager {
  private _protogen;
  private _redis;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this.protogen.logger.info("Redis", "Setting up connection to redis server " + cyan(this.config.host) + " on port " + cyan(String(this.config.port)));
    this._redis = new Redis({
      host: this.config.host,
      port: this.config.port,
    });

    Channels.forEach(c => {
      this.protogen.logger.info("Redis", "Subscribing to channel " + cyan(c));
      this._redis.subscribe(c).then(() => {
        this.protogen.logger.info("Redis", "Subscribed to " + cyan(c) + " successfully");
      }).catch(err => {
        console.error(err);
        this.protogen.logger.error("Redis", "Failed to subscribe to " + cyan(c));
      });
    });

    this._redis.on("error", (err) => {
      console.error("Redis error: ", err);
    });

    this._redis.on("message", (channel: string, message: string) => {
      //console.log(message);
      if (channel == AudioChannel) {
        const volumeNorm = parseFloat(message);
        console.log(volumeNorm);
      }
    });
  }

  public get protogen() {
    return this._protogen;
  }

  private get config() {
    return this.protogen.config.redis;
  }
}