import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogsPageComponent } from './pages/logs-page/logs-page.component';
import { LogWindowComponent } from './componensts/log-window/log-window.component';

@NgModule({
  declarations: [
    LogsPageComponent,
    LogWindowComponent
  ],
  imports: [
    CommonModule
  ]
})
export class LogsModule { }
