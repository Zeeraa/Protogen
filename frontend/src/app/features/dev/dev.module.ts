import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeveloperPageComponent } from './pages/developer-page/developer-page.component';
import { DevLedPreviewComponent } from './components/dev-led-preview/dev-led-preview.component';
import { VisorModule } from '../visor/visor.module';

@NgModule({
  declarations: [
    DeveloperPageComponent,
    DevLedPreviewComponent,
  ],
  imports: [
    CommonModule,
    VisorModule,
  ],
  exports: [
    DeveloperPageComponent
  ],
})
export class DevModule { }
