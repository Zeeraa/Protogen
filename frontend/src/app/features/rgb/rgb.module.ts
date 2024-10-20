import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RgbDashboardPageComponent } from './pages/rgb-dashboard-page/rgb-dashboard-page.component';
import { RgbEditorPageComponent } from './pages/rgb-editor-page/rgb-editor-page.component';
import { RgbSceneCardComponent } from './components/rgb-scene-card/rgb-scene-card.component';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RgbEffectCardComponent } from './components/rgb-effect-card/rgb-effect-card.component';
import { RgbPropertyComponent } from './components/rgb-property/rgb-property.component';
import { RgbIntPropertyComponent } from './components/properties/rgb-int-property/rgb-int-property.component';
import { RgbColorPropertyComponent } from './components/properties/rgb-color-property/rgb-color-property.component';
import { RgbBooleanPropertyComponent } from './components/properties/rgb-boolean-property/rgb-boolean-property.component';
import { RgbPreviewComponent } from './components/rgb-preview/rgb-preview.component';

@NgModule({
  declarations: [
    RgbDashboardPageComponent,
    RgbEditorPageComponent,
    RgbSceneCardComponent,
    RgbEffectCardComponent,
    RgbPropertyComponent,
    RgbIntPropertyComponent,
    RgbColorPropertyComponent,
    RgbBooleanPropertyComponent,
    RgbPreviewComponent,
  ],
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    RgbDashboardPageComponent,
    RgbEditorPageComponent,
    RgbPropertyComponent,
  ]
})
export class RgbModule { }
