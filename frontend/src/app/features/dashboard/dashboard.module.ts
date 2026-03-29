import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { DashboardStatusCardComponent } from './components/dashboard-status-card/dashboard-status-card.component';
import { DashboardActionsCardComponent } from './components/dashboard-actions-card/dashboard-actions-card.component';
import { DashboardFaceCardComponent } from './components/dashboard-face-card/dashboard-face-card.component';
import { DashboardRgbCardComponent } from './components/dashboard-rgb-card/dashboard-rgb-card.component';
import { DashboardBoopCardComponent } from './components/dashboard-boop-card/dashboard-boop-card.component';

@NgModule({
  declarations: [
    DashboardPageComponent,
    DashboardStatusCardComponent,
    DashboardActionsCardComponent,
    DashboardFaceCardComponent,
    DashboardRgbCardComponent,
    DashboardBoopCardComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    DashboardPageComponent,
  ],
})
export class DashboardModule { }
