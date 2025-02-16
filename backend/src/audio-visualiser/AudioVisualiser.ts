import { Protogen } from "../Protogen";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";

const KV_AudioVisualiserRawAmplification = "AudioVisualiserRawAmplification";
const KV_AudioVisualiserLowThreshold = "AudioVisualiserLowThreshold";
const KV_AudioVisualiserHighThreshold = "AudioVisualiserHighThreshold";

export class AudioVisualiser {
  private _protogen;

  private _cachedValue: number | null = null;

  private _rawValue: number = 0;
  private _rawAmplification = 20;
  private _lowThreshold = 0;
  private _highThreshold = 100;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  get protogen() {
    return this._protogen;
  }

  get rawValue() {
    return this._rawValue;
  }

  set rawValue(value: number) {
    this._rawValue = value;
    this._cachedValue = null;
    this.protogen.webServer.socketSessions.filter(s => s.enableAudioPreview).forEach(subscriber => {
      subscriber.sendMessage(SocketMessageType.S2C_RemoteAudioLevel, value);
    })
  }

  get rawAmplification() {
    return this._rawAmplification;
  }

  set rawAmplification(value: number) {
    this._rawAmplification = value;
    this._cachedValue = null;
  }

  get lowThreshold() {
    return this._lowThreshold;
  }

  set lowThreshold(value: number) {
    this._lowThreshold = value;
    this._cachedValue = null;
  }

  get highThreshold() {
    return this._highThreshold;
  }

  set highThreshold(value: number) {
    this._highThreshold = value;
    this._cachedValue = null;
  }

  public getValue() {
    if (this._cachedValue != null) {
      return this._cachedValue;
    }

    let value = this.rawValue * this.rawAmplification;
    if (value > 100) {
      value = 100;
    }

    value = toDecimal(value, this.lowThreshold, this.highThreshold);

    this._cachedValue = value;

    return value;
  }

  public async saveSettings() {
    await this.protogen.database.setData(KV_AudioVisualiserRawAmplification, String(this._rawAmplification));
    await this.protogen.database.setData(KV_AudioVisualiserLowThreshold, String(this._lowThreshold));
    await this.protogen.database.setData(KV_AudioVisualiserHighThreshold, String(this._highThreshold));
  }

  public async loadSettingsFromDatabase() {
    const amplification = parseInt(String(this.protogen.database.getData(KV_AudioVisualiserRawAmplification) || 20));
    const lowThreshold = parseInt(String(this.protogen.database.getData(KV_AudioVisualiserLowThreshold) || 0));
    const highThreshold = parseInt(String(this.protogen.database.getData(KV_AudioVisualiserHighThreshold) || 100));

    if (!isNaN(amplification)) {
      this._rawAmplification = amplification;
    }

    if (!isNaN(lowThreshold)) {
      this._lowThreshold = lowThreshold;
    }

    if (!isNaN(highThreshold)) {
      this._highThreshold = highThreshold;
    }
  }

  public async init() {
    await this.loadSettingsFromDatabase();
  }
}

function toDecimal(value: number, min: number, max: number): number {
  if (min > max) {
    return 1.0;
  }

  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
