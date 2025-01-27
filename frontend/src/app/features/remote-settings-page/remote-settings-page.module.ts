import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RemoteSettingsPageComponent } from './pages/remote-settings-page/remote-settings-page.component';

@NgModule({
  declarations: [
    RemoteSettingsPageComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    RemoteSettingsPageComponent
  ]
})
export class RemoteSettingsPageModule { }
