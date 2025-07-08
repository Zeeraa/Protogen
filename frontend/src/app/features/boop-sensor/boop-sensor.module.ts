import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoopSensorPageComponent } from './pages/boop-sensor-page/boop-sensor-page.component';
import { BoopeSensorProfileCardComponent } from './components/boop-sensor-profile-card/boop-sensor-profile-card.component';
import { RouterLink } from '@angular/router';
import { BoopSensorProfileEditorPageComponent } from './pages/boop-sensor-profile-editor-page/boop-sensor-profile-editor-page.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    BoopSensorPageComponent,
    BoopeSensorProfileCardComponent,
    BoopSensorProfileEditorPageComponent
  ],
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
  ]
})
export class BoopSensorModule { }
