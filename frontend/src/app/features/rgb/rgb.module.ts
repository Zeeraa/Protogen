import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RgbDashboardPageComponent } from './pages/rgb-dashboard-page/rgb-dashboard-page.component';
import { RgbEditorPageComponent } from './pages/rgb-editor-page/rgb-editor-page.component';
import { RgbSceneCardComponent } from './components/rgb-scene-card/rgb-scene-card.component';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RgbEffectCardComponent } from './components/rgb-effect-card/rgb-effect-card.component';

@NgModule({
  declarations: [
    RgbDashboardPageComponent,
    RgbEditorPageComponent,
    RgbSceneCardComponent,
    RgbEffectCardComponent,
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
  ]
})
export class RgbModule { }
