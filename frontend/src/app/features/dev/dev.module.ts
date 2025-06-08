import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeveloperPageComponent } from './pages/developer-page/developer-page.component';

@NgModule({
  declarations: [
    DeveloperPageComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    DeveloperPageComponent
  ],
})
export class DevModule { }
