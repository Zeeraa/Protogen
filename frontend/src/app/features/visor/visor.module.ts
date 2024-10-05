import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisorPageComponent } from './pages/visor-page/visor-page.component';
import { RendererCardComponent } from './components/renderer-card/renderer-card.component';



@NgModule({
  declarations: [
    VisorPageComponent,
    RendererCardComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    VisorPageComponent
  ]
})
export class VisorModule { }
