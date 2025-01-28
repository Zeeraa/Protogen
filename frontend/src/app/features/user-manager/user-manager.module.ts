import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserManagerPageComponent } from './pages/user-manager-page/user-manager-page.component';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    UserManagerPageComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModalModule,
    RouterModule,
  ],
  exports: [
    UserManagerPageComponent
  ]
})
export class UserManagerModule { }
