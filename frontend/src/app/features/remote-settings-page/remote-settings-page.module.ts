import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RemoteSettingsPageComponent } from './pages/remote-settings-page/remote-settings-page.component';
import { RemoteProfileCardComponent } from './components/remote-profile-card/remote-profile-card.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RemoteActionEditorComponent } from './components/remote-action-editor/remote-action-editor.component';

@NgModule({
  declarations: [
    RemoteSettingsPageComponent,
    RemoteProfileCardComponent,
    RemoteActionEditorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    RemoteSettingsPageComponent
  ]
})
export class RemoteSettingsPageModule { }
