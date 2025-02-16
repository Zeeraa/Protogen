import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { FormsModule } from '@angular/forms';
import { DashboardActionCardComponent } from './components/dashboard-action-card/dashboard-action-card.component';
import { DashboardExpressionCardComponent } from './components/dashboard-expression-card/dashboard-expression-card.component';
import { DashboardRgbCardComponent } from './components/dashboard-rgb-card/dashboard-rgb-card.component';
import { DashboardFaceRgbCardComponent } from './components/dashboard-face-rgb-card/dashboard-face-rgb-card.component';

@NgModule({
  declarations: [
    DashboardPageComponent,
    DashboardActionCardComponent,
    DashboardExpressionCardComponent,
    DashboardRgbCardComponent,
    DashboardFaceRgbCardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  exports: [
    DashboardPageComponent
  ],
})
export class DashboardModule { }
