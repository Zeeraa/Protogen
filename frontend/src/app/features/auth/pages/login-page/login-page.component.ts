import { AfterViewInit, Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-login-page',
  standalone: false,
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent implements AfterViewInit {
  protected loginForm: FormGroup;
  wrongUsernameOrPassword = false;

  constructor(
    protected auth: AuthService,
    private authApi: AuthApiService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
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
        console.log("Logged in as " + this.auth.authDetails?.username);
        this.toastr.success("Logged in as " + this.auth.authDetails?.username);

        this.redirectAfterAuth();
      } else {
        console.log("User failed login");
        this.wrongUsernameOrPassword = true;
        this.toastr.error("Invalid username or password");
      }
    } catch (err) {
      console.error(err);
      this.toastr.error("An error occurred while logging in");
    }
    this.loginForm.enable();
  }

  ngAfterViewInit(): void {
    this.authApi.checkAuth().pipe(
      catchError(err => {
        console.error("Error checking auth:", err);
        return of(false);
      })
    ).subscribe(alreadyAuthenticated => {
      if (alreadyAuthenticated) {
        console.log("Already authenticated, redirecting to home");
        this.redirectAfterAuth();
      }
    });
  }

  private redirectAfterAuth() {
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.router.navigateByUrl(params['returnUrl']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
