import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiKeyManagerPageComponent } from './pages/api-key-manager-page/api-key-manager-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    ApiKeyManagerPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  exports: [
    ApiKeyManagerPageComponent
  ]
})
export class ApiKeyManagerModule { }
