import { FaceColorEffect, FaceExpression } from "../services/api/face-api.service";
import { RgbScene } from "../services/api/rgb-api.service";
import { SavedVideo } from "../services/api/video-player-api.service";
import { VisorRenderer } from "../services/api/visor-api.service";

export interface ActionDataSet {
  visorRenderers: VisorRenderer[];
  rgbScenes: RgbScene[];
  savedVideos: SavedVideo[];
  expressions: FaceExpression[];
  faceColorEffects: FaceColorEffect[];
}
