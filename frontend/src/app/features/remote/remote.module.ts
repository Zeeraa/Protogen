import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamepadPreviewComponent } from './components/gamepad-preview/gamepad-preview.component';
import { GamepadRemotePageComponent } from './pages/gamepad-remote-page/gamepad-remote-page.component';
import { FormField } from "@angular/forms/signals";

@NgModule({
  declarations: [
    GamepadRemotePageComponent,
    GamepadPreviewComponent,
  ],
  imports: [
    CommonModule,
    FormField
  ],
  exports: [
    GamepadRemotePageComponent,
  ],
})
export class RemoteModule { }
