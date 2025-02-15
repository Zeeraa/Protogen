import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { FormsModule } from '@angular/forms';
import { DashboardActionCardComponent } from './components/dashboard-action-card/dashboard-action-card.component';

@NgModule({
  declarations: [
    DashboardPageComponent,
    DashboardActionCardComponent
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
