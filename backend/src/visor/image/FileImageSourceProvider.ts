import { loadImage } from "canvas";
import { SourceProvider } from "./SourceProvider";

export class FileImageSourceProvider extends SourceProvider {
  private _path;

  constructor(path: string) {
    super();
    this._path = path;
  }

  async provideImage() {
    return await loadImage(this._path);
  }
}