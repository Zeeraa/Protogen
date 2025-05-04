import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppsPageComponent } from './pages/apps-page/apps-page.component';
import { AppCardComponent } from './components/app-card/app-card.component';

@NgModule({
  declarations: [
    AppsPageComponent,
    AppCardComponent
  ],
  imports: [
    CommonModule
  ]
})
export class AppsModule { }
