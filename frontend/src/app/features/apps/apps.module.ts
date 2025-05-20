import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppsPageComponent } from './pages/apps-page/apps-page.component';
import { AppCardComponent } from './components/app-card/app-card.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaintModule } from './ui/paint/paint.module';

@NgModule({
  declarations: [
    AppsPageComponent,
    AppCardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaintModule,
  ]
})
export class AppsModule { }
