import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemPageComponent } from './pages/system-page/system-page.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@NgModule({
  declarations: [
    SystemPageComponent
  ],
  imports: [
    CommonModule,
    NgbProgressbarModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
  ]
})
export class SystemModule { }
