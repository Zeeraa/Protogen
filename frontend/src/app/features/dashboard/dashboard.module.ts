import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { FormsModule } from '@angular/forms';
import { DashboardActionCardComponent } from './components/dashboard-action-card/dashboard-action-card.component';
import { DashboardExpressionCardComponent } from './components/dashboard-expression-card/dashboard-expression-card.component';

@NgModule({
  declarations: [
    DashboardPageComponent,
    DashboardActionCardComponent,
    DashboardExpressionCardComponent
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
