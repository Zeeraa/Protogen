import { Injectable } from '@angular/core';
import { LocalStorageKey_AuthToken } from './utils/LocalStorageKeys';
import { jwtDecode } from 'jwt-decode';
import { AuthApiService } from './api/auth-api.service';
import { BehaviorSubject, catchError, Subject } from 'rxjs';
import { typeAssert } from './utils/Utils';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStateSubject = new BehaviorSubject<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  private _loggedIn = false;
  private _loginNeeded = false;
  private _authDetails: ProtogenJWTPayload | null = null;
  private _token: string | null = null;
  private _tokenRefreshedSubject = new Subject<string>();
  private _tokenChangedSubject = new Subject<string>();

  public get authState$() {
    return this.authStateSubject.asObservable();
  }

  get tokenRefreshedObservable() {
    return this._tokenRefreshedSubject.asObservable();
  }

  get tokenChangedObservable() {
    return this._tokenChangedSubject.asObservable();
  }

  get loggedIn() {
    return this._loggedIn;
  }

  get loginNeeded() {
    return this._loginNeeded;
  }

  get authDetails() {
    return this._authDetails;
  }

  logout() {
    this._token = null;
    localStorage.removeItem(LocalStorageKey_AuthToken);
    window.location.reload();
  }

  get token() {
    return this._token;
  }

  private set token(newToken: string | null) {
    this._token = newToken;
    if (newToken != null) {
      this.parseToken(newToken);
      localStorage.setItem(LocalStorageKey_AuthToken, newToken);
      this._tokenChangedSubject.next(newToken);
    }
  }

  public setToken(token: string) {
    this.token = token;
    this._loggedIn = true;
  }

  public parseToken(token: string) {
    const decoded = typeAssert<ProtogenJWTPayload>(jwtDecode(token));
    this._authDetails = {
      isSuperUser: decoded.isSuperUser,
      passwordChangeDate: decoded.passwordChangeDate,
      userId: decoded.userId,
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp,
    }
    //console.log(decoded);
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
            this._tokenRefreshedSubject.next(newToken);
            this.authStateSubject.next('authenticated');
            return resolve();
          }
        } else {
          console.log("No token found");
        }
      } catch (err) {
        console.error("An error occurred while logging in");
        console.error(err);
      }

      console.log("Not logged in or token expired");
      this._loggedIn = false;
      this._loginNeeded = true;
      this.authStateSubject.next('unauthenticated');
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
        this._loginNeeded = false;
        this.authStateSubject.next('authenticated');
        resolve(true);
      })
    });
  }

  constructor(
    private authApi: AuthApiService,
  ) {
    setInterval(async () => {
      if (this.loggedIn) {
        try {
          const newToken = await this.tryRefreshToken();
          if (newToken == null) {
            console.log("Token seems to have expired. Showing login page");
            this.authStateSubject.next('unauthenticated');
            this._loggedIn = false;
            this._loginNeeded = true;
          } else {
            console.log("Token refreshed");
            this.token = newToken;
            this._tokenRefreshedSubject.next(this.token);
          }
        } catch (err) {
          console.error("Failed to refresh token");
          console.error(err);
        }
      }
    }, 1000 * 60 * 10);
  }
}

export interface ProtogenJWTPayload {
  userId: number;
  passwordChangeDate: string;
  isSuperUser: boolean;
  username: string;
  iat: number;
  exp: number;
}
