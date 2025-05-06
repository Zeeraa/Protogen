import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PasswordlessSigninButtonComponent } from './passwordless-signin-button/passwordless-signin-button.component';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginPageComponent } from './pages/login-page/login-page.component';

@NgModule({
  declarations: [
    PasswordlessSigninButtonComponent,
    AuthPageComponent,
    LoginPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    PasswordlessSigninButtonComponent,
  ]
})
export class AuthModule { }
