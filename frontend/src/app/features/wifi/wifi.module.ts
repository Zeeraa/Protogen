import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormField, FormRoot } from '@angular/forms/signals';
import { WifiPageComponent } from './pages/wifi-page/wifi-page.component';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [WifiPageComponent],
  imports: [
    CommonModule,
    RouterModule,
    NgbModalModule,
    FormField,
    FormRoot,
  ]
})
export class WifiModule { }
