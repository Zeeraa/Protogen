import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionsPageComponent } from './pages/actions-page/actions-page.component';
import { ActionCardComponent } from './components/action-card/action-card.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { ActionListEntryComponent } from './components/action-list-entry/action-list-entry.component';

@NgModule({
  declarations: [
    ActionsPageComponent,
    ActionCardComponent,
    ActionListEntryComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModalModule,
  ]
})
export class ActionsModule { }
