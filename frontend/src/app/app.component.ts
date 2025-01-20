import { Component, OnInit } from '@angular/core';
import { SocketService } from './core/services/socket/socket.service';
import { AuthService } from './core/services/auth.service';
import { FormControl, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  protected loginForm: FormGroup;
  wrongUsernameOrPassword = false;

  constructor(
    protected auth: AuthService,
    private toastr: ToastrService,
    private socket: SocketService
  ) {
    this.loginForm = new FormGroup({
      username: new FormControl(""),
      password: new FormControl(""),
    });
  }

  get loginDisabled() {
    return this.loginForm.disabled;
  }

  async tryLogin() {
    if (this.loginDisabled) {
      return;
    }

    const username = String(this.loginForm.get("username")?.value);
    const password = String(this.loginForm.get("password")?.value);

    this.wrongUsernameOrPassword = false;
    this.loginForm.disable();
    try {
      const success = await this.auth.login(username, password);
      if (success) {
        console.log("Loagged in as " + this.auth.authDetails?.username);
        this.toastr.success("Logged in as " + this.auth.authDetails?.username);
      } else {
        console.log("User failed login");
        this.wrongUsernameOrPassword = true;
        this.toastr.error("Invalid username or password");
      }
    } catch (err) {
      console.error(err);
      this.toastr.error("An error occured while logging in");
    }
    this.loginForm.enable();
  }

  ngOnInit(): void {
    this.init();
  }

  async init() {
    await this.auth.init();
    this.socket.init();
  }
}
