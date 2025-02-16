import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { AudioVisualizerSettingsPageComponent } from './pages/audio-visualizer-settings-page/audio-visualizer-settings-page.component';

@NgModule({
  declarations: [
    AudioVisualizerSettingsPageComponent,
  ],
  imports: [
    CommonModule,
    NgbProgressbarModule,
    FormsModule,
  ]
})
export class AudioVisualizerModule { }
