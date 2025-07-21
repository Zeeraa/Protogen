import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoopSensorPageComponent } from './pages/boop-sensor-page/boop-sensor-page.component';
import { BoopeSensorProfileCardComponent } from './components/boop-sensor-profile-card/boop-sensor-profile-card.component';
import { RouterLink } from '@angular/router';
import { BoopSensorProfileEditorPageComponent } from './pages/boop-sensor-profile-editor-page/boop-sensor-profile-editor-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileActionEntryComponent } from './components/profile-action-entry/profile-action-entry.component';



@NgModule({
  declarations: [
    BoopSensorPageComponent,
    BoopeSensorProfileCardComponent,
    BoopSensorProfileEditorPageComponent,
    ProfileActionEntryComponent
  ],
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class BoopSensorModule { }
