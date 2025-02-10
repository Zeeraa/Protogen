import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisorPageComponent } from './pages/visor-page/visor-page.component';
import { RendererCardComponent } from './components/renderer-card/renderer-card.component';
import { RouterLink } from '@angular/router';
import { VisorImageFaceEditorComponent } from './pages/visor-image-face-editor/visor-image-face-editor.component';
import { VisorLivePreviewComponent } from './components/visor-live-preview/visor-live-preview.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProtogenFaceEditorComponent } from './pages/protogen-face-editor/protogen-face-editor.component';
import { ProtogenExpressionCardComponent } from './components/protogen-expression-card/protogen-expression-card.component';
import { VisorAssetPickerComponent } from './components/visor-asset-picker/visor-asset-picker.component';
import { FaceColorEffectCardComponent } from './components/face-color-effect-card/face-color-effect-card.component';
import { FaceRgbBooleanPropertyComponent } from './components/face-rgb-property/properties/face-rgb-boolean-property/face-rgb-boolean-property.component';
import { FaceRgbColorPropertyComponent } from './components/face-rgb-property/properties/face-rgb-color-property/face-rgb-color-property.component';
import { FaceRgbIntPropertyComponent } from './components/face-rgb-property/properties/face-rgb-int-property/face-rgb-int-property.component';
import { FaceRgbPropertyComponent } from './components/face-rgb-property/face-rgb-property.component';
import { RgbModule } from "../rgb/rgb.module";

@NgModule({
  declarations: [
    VisorPageComponent,
    RendererCardComponent,
    VisorImageFaceEditorComponent,
    VisorLivePreviewComponent,
    ProtogenFaceEditorComponent,
    ProtogenExpressionCardComponent,
    VisorAssetPickerComponent,
    FaceColorEffectCardComponent,
    FaceRgbPropertyComponent,
    FaceRgbBooleanPropertyComponent,
    FaceRgbColorPropertyComponent,
    FaceRgbIntPropertyComponent
  ],
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    RgbModule
  ],
  exports: [
    VisorPageComponent
  ]
})
export class VisorModule { }
