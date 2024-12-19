import { Image } from "canvas";
import { SourceProvider } from "./SourceProvider";

export class ExistingImageSourceProvider extends SourceProvider {
  private _image;

  constructor(image: Image) {
    super();
    this._image = image;
  }

  async provideImage() {
    return this._image;
  }
}