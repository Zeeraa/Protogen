import { Image } from "canvas";

export abstract class SourceProvider {
  abstract provideImage(): Promise<Image>;
}