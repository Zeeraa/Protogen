import { Injectable } from '@angular/core';
import { LocalStorageKey_AuthToken } from './utils/LocalStorageKeys';
import { jwtDecode } from 'jwt-decode';
import { AuthApiService } from './api/auth-api.service';
import { catchError } from 'rxjs';
import { typeAssert } from './utils/Utils';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _loggedIn = false;
  private _loginNeeded = false;
  private _authDetails: ProtogenJWTPayload | null = null;
  private _token: string | null = null;

  get loggedIn() {
    return this._loggedIn;
  }

  get loginNeeded() {
    return this._loginNeeded;
  }

  get authDetails() {
    return this._authDetails;
  }

  get token() {
    return this._token;
  }

  private set token(newToken: string | null) {
    this._token = newToken;
    if (newToken != null) {
      this.parseToken(newToken);
      localStorage.setItem(LocalStorageKey_AuthToken, newToken);
    }

  }

  public parseToken(token: string) {
    const decoded = jwtDecode(token);
    this._authDetails = {
      isSuperUser: typeAssert<ProtogenJWTPayload>(decoded).isSuperUser,
      passwordChangeDate: typeAssert<ProtogenJWTPayload>(decoded).passwordChangeDate,
      userId: typeAssert<ProtogenJWTPayload>(decoded).userId,
      username: typeAssert<ProtogenJWTPayload>(decoded).username,
    }
    console.log(decoded);
  }

  public tryRefreshToken(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      if (this.token == null) {
        return reject(new Error("Tried to refresh token but token was not set"));
      }

      this.authApi.refreshToken().pipe(catchError(err => {
        console.error("Failed to refresh auth token");
        reject(err);
        throw err;
      })).subscribe(result => {
        resolve(result);
      })
    });
  }

  public init(): Promise<void> {
    return new Promise<void>(async (resolve) => {
      try {
        const token = localStorage.getItem(LocalStorageKey_AuthToken);

        if (token != null) {
          this._token = token;
          console.log("Token found. Checking if its valid and refreshing it");

          const newToken = await this.tryRefreshToken();

          if (newToken != null) {
            this.token = newToken;
            this._loggedIn = true;
            return resolve();
          }
        } else {
          console.log("No token found");
        }
      } catch (err) {
        console.error("An error occured while logging in");
        console.error(err);
      }

      console.log("Not logged in or token expired");
      this._loggedIn = false;
      this._loginNeeded = true;
      resolve();
    });
  }

  public login(username: string, password: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.authApi.login(username, password).pipe(catchError(err => {
        reject(err);
        throw err;
      })).subscribe(token => {
        if (token == null) {
          return resolve(false);
        }

        this.token = token;
        this._loggedIn = true;
        resolve(true);
      })
    });
  }

  constructor(
    private authApi: AuthApiService,
  ) { }
}

export interface ProtogenJWTPayload {
  userId: number;
  passwordChangeDate: string;
  isSuperUser: boolean;
  username: string;
}
