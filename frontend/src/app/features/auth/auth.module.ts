import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PasswordlessSigninButtonComponent } from './passwordless-signin-button/passwordless-signin-button.component';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    PasswordlessSigninButtonComponent,
    AuthPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  exports: [
    PasswordlessSigninButtonComponent,
  ]
})
export class AuthModule { }
