import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { typeAssert } from '../utils/Utils';

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

  getUsers(): Observable<ProtogenUser[]> {
    return typeAssert<Observable<ProtogenUser[]>>(this.http.get(this.apiBaseUrl + "/users").pipe(catchError(this.defaultErrorHandler)));
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(this.apiBaseUrl + "/users/" + userId).pipe(catchError(this.defaultErrorHandler))
  }

  createUser(data: CreateNewUserData): Observable<ProtogenUser> {
    return typeAssert<Observable<ProtogenUser>>(this.http.post(this.apiBaseUrl + "/users", data).pipe(catchError(this.defaultErrorHandler)));
  }

  changePassword(userId: number, data: ChangePasswordData): Observable<ProtogenUser> {
    return typeAssert<Observable<ProtogenUser>>(this.http.put(this.apiBaseUrl + "/users/" + userId + "/password", data).pipe(catchError(this.defaultErrorHandler)));
  }
}

export interface ChangePasswordData {
  oldPassword: string;
  password: string;
}

export interface CreateNewUserData {
  username: string;
  password: string;
  superUser: boolean;
}

export interface ProtogenUser {
  id: number;
  username: string;
  lasPasswordChange: string;
  superUser: boolean;
}
