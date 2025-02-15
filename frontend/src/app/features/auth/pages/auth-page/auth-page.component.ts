import { Component } from '@angular/core';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-auth-page',
  standalone: false,
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent {
  code = "";

  constructor(
    private authApi: AuthApiService,
    private toastr: ToastrService,
  ) { }

  approveLogin() {
    if (this.code.trim().length != 8) {
      this.toastr.error("Invalid code");
      return;
    }

    this.authApi.approveLogin(this.code).pipe(
      catchError(err => {
        this.toastr.error("Failed to approve login");
        throw err;
      })
    ).subscribe(response => {
      if (response == null) {
        this.toastr.error("Invalid or expired code");
      } else {
        this.code = "";
        this.toastr.success("Login approved");
      }
    })
  }
}
