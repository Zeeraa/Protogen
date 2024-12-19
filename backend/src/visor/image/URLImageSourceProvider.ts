import axios from "axios";
import { SourceProvider } from "./SourceProvider";
import { loadImage } from "canvas";

export class URLImageSourceProvider extends SourceProvider {
  private _url;

  constructor(url: string) {
    super();
    this._url = url;
  }

  async provideImage() {
    const response = await axios.get(this._url, { responseType: 'arraybuffer' });
    return await loadImage(response.data);
  }
}