import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppsPageComponent } from './pages/apps-page/apps-page.component';
import { AppCardComponent } from './components/app-card/app-card.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaintModule } from './ui/paint/paint.module';
import { DosboxModule } from './ui/dosbox/dosbox.module';
import { AdditionalButtonComponent } from './components/app-card/additional-button/additional-button.component';

@NgModule({
  declarations: [
    AppsPageComponent,
    AppCardComponent,
    AdditionalButtonComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaintModule,
    DosboxModule,
  ]
})
export class AppsModule { }
