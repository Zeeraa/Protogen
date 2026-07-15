import { AfterViewInit, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { catchError, of } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-login-page',
  standalone: false,
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent implements AfterViewInit {
  protected readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected loginForm: FormGroup;
  wrongUsernameOrPassword = false;

  constructor() {
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
        this.toast.success("Logged in as " + this.auth.authDetails?.username);

        this.redirectAfterAuth();
      } else {
        console.log("User failed login");
        this.wrongUsernameOrPassword = true;
        this.toast.error("Invalid username or password");
      }
    } catch (err) {
      console.error(err);
      this.toast.error("An error occurred while logging in");
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
