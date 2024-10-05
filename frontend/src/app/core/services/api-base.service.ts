import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiBaseService {
  get apiBaseUrl() {
    return environment.apiUrl;
  }

  constructor(
    protected http: HttpClient,
    protected toastr: ToastrService,
  ) { }

  protected defaultErrorHandler = (err: HttpErrorResponse) => {
    if (err.status == 0) {
      console.error("Got status 0 from request");
      this.toastr.error("Failed to communicate with the server. Check your connection and try again");
    } else if (err.status == 503 || err.status == 502) {
      this.toastr.error("The backend api is unavailable");
    }

    return throwError(() => err);
  }
}
