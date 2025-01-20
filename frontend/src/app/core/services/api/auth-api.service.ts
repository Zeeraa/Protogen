import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService extends ApiBaseService {
  login(username: string, password: string): Observable<string | null> {
    return this.http.post(this.apiBaseUrl + "/auth/authenticate", { username, password }).pipe(
      map((response: any) => {
        return response.token as string;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return of(null);
        } else {
          throw error;
        }
      }),
    );
  }

  refreshToken(): Observable<string | null> {
    return this.http.post(this.apiBaseUrl + "/auth/refresh-token", {}).pipe(
      map((response: any) => {
        return response.token as string;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return of(null);
        } else {
          throw error;
        }
      }),
    );
  }
}
