import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisorPageComponent } from './pages/visor-page/visor-page.component';
import { RendererCardComponent } from './components/renderer-card/renderer-card.component';
import { RouterLink } from '@angular/router';
import { VisorImageFaceEditorComponent } from './pages/visor-image-face-editor/visor-image-face-editor.component';
import { VisorLivePreviewComponent } from './components/visor-live-preview/visor-live-preview.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProtogenFaceEditorComponent } from './pages/protogen-face-editor/protogen-face-editor.component';



@NgModule({
  declarations: [
    VisorPageComponent,
    RendererCardComponent,
    VisorImageFaceEditorComponent,
    VisorLivePreviewComponent,
    ProtogenFaceEditorComponent
  ],
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    VisorPageComponent
  ]
})
export class VisorModule { }
