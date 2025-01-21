import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserManagerPageComponent } from './pages/user-manager-page/user-manager-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';



@NgModule({
  declarations: [
    UserManagerPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModalModule,
  ]
})
export class UserManagerModule { }
