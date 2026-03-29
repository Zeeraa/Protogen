import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FormField } from "@angular/forms/signals";
import { GamepadPreviewComponent } from './components/gamepad-preview/gamepad-preview.component';
import { GamepadProfileCardComponent } from './components/gamepad-profile-card/gamepad-profile-card.component';
import { GamepadTriggerRowComponent } from './components/gamepad-trigger-row/gamepad-trigger-row.component';
import { GamepadRemotePageComponent } from './pages/gamepad-remote-page/gamepad-remote-page.component';
import { GamepadProfileEditorPageComponent } from './pages/gamepad-profile-editor-page/gamepad-profile-editor-page.component';

@NgModule({
  declarations: [
    GamepadRemotePageComponent,
    GamepadPreviewComponent,
    GamepadProfileCardComponent,
    GamepadTriggerRowComponent,
    GamepadProfileEditorPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgbModalModule,
    FormField,
  ],
  exports: [
    GamepadRemotePageComponent,
  ],
})
export class RemoteModule { }
