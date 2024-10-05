import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemPageComponent } from './pages/system-page/system-page.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    SystemPageComponent
  ],
  imports: [
    CommonModule,
    NgbProgressbarModule,
  ]
})
export class SystemModule { }
