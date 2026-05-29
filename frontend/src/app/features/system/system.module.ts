import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemPageComponent } from './pages/system-page/system-page.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormField } from '@angular/forms/signals';
import { ImageCropperComponent } from 'ngx-image-cropper';

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
    FormField,
    ImageCropperComponent,
  ]
})
export class SystemModule { }
