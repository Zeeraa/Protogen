import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisorPageComponent } from './pages/visor-page/visor-page.component';



@NgModule({
  declarations: [
    VisorPageComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    VisorPageComponent
  ]
})
export class VisorModule { }
