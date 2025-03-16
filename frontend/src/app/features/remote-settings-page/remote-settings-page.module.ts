import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JoystickEditorComponent } from './components/joystick-editor/joystick-editor.component';
import { JoystickRemoteActionEditorComponent } from './components/joystick-remote-action-editor/joystick-remote-action-editor.component';
import { JoystickRemoteProfileCardComponent } from './components/joystick-remote-profile-card/joystick-remote-profile-card.component';
import { JoystickRemoteSettingsPageComponent } from './pages/remote-settings-page/joystick-remote-settings-page.component';

@NgModule({
  declarations: [
    JoystickEditorComponent,
    JoystickRemoteActionEditorComponent,
    JoystickRemoteProfileCardComponent,
    JoystickRemoteSettingsPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    JoystickRemoteSettingsPageComponent,
  ]
})
export class RemoteSettingsPageModule { }
