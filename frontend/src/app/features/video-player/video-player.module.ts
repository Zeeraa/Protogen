import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoPlayerPageComponent } from './pages/video-player-page/video-player-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SavedVideoCardComponent } from './components/saved-video-card/saved-video-card.component';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    VideoPlayerPageComponent,
    SavedVideoCardComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbAccordionModule,
  ],
  exports: [
    VideoPlayerPageComponent
  ]
})
export class VideoPlayerModule { }
