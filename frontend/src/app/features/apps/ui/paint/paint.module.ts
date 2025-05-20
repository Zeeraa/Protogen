import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaintAppPageComponent } from './paint-app-page/paint-app-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    PaintAppPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class PaintModule { }
