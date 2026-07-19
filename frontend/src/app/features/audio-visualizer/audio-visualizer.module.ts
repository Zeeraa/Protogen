import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioVisualizerPageComponent } from './pages/audio-visualizer-page/audio-visualizer-page.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AudioVisualizerPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class AudioVisualizerModule { }
