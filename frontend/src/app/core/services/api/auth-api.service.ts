import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService extends ApiBaseService {
  login(username: string, password: string) {
    return this.http.post<ITokenResponse>(this.apiBaseUrl + "/auth/authenticate", { username, password }).pipe(
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

  refreshToken() {
    return this.http.post<ITokenResponse>(this.apiBaseUrl + "/auth/refresh-token", {}).pipe(
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

  getUsers() {
    return this.http.get<ProtogenUser[]>(this.apiBaseUrl + "/users").pipe(catchError(this.defaultErrorHandler));
  }

  deleteUser(userId: number) {
    return this.http.delete(this.apiBaseUrl + "/users/" + userId).pipe(catchError(this.defaultErrorHandler))
  }

  createUser(data: CreateNewUserData) {
    return this.http.post<ProtogenUser>(this.apiBaseUrl + "/users", data).pipe(catchError(this.defaultErrorHandler));
  }

  changePassword(userId: number, data: ChangePasswordData) {
    return this.http.put<ProtogenUser>(this.apiBaseUrl + "/users/" + userId + "/password", data).pipe(catchError(this.defaultErrorHandler));
  }

  beginPasswordlessSignIn() {
    return this.http.post<PasswordlessSigninRequest>(this.apiBaseUrl + "/auth/passwordless-signin/new", {}).pipe(catchError(this.defaultErrorHandler));
  }

  checkSigninRequestStatus(request: PasswordlessSigninRequest) {
    return this.http.post<PasswordlessSigninRequestStatus>(this.apiBaseUrl + "/auth/passwordless-signin/check", request).pipe(catchError(this.defaultErrorHandler));
  }

  aquireTokenFromPasswordless(request: PasswordlessSigninRequest) {
    return this.http.post<ITokenResponse>(this.apiBaseUrl + "/auth/passwordless-signin/authenticate", request).pipe(catchError(this.defaultErrorHandler));
  }

  approveLogin(signinKey: string) {
    return this.http.post<ITokenResponse>(this.apiBaseUrl + "/auth/passwordless-signin/approve", { signinKey }).pipe(
      catchError(this.defaultErrorHandler),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(null);
        } else {
          throw error;
        }
      }),
    );
  }
}

export interface PasswordlessSigninRequest {
  requestId: string;
  signinKey: string;
}

export interface PassworlessSigninApproval extends PasswordlessSigninRequest {
  expiresAt: string;
}

export interface PasswordlessSigninRequestStatus extends PasswordlessSigninRequest {
  expiresAt: string;
  used: boolean;
  approvedBy: PasswordlessApprovalBy | null;
}

interface PasswordlessApprovalBy {
  name: string;
}

interface ITokenResponse {
  token: string;
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
