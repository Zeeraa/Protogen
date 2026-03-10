import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RemotePageComponent } from './pages/remote-page/remote-page.component';
import { GamepadPreviewComponent } from './components/gamepad-preview/gamepad-preview.component';

@NgModule({
  declarations: [
    RemotePageComponent,
    GamepadPreviewComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    RemotePageComponent,
    GamepadPreviewComponent,
  ],
})
export class RemoteModule { }
