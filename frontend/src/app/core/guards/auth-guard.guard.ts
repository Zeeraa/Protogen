import { Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { filter, map, Observable, take } from "rxjs";

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) { }

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.auth.authState$.pipe(
      filter(state => state !== 'loading'), // Wait until not loading
      take(1),
      map(authState => {
        if (authState === 'authenticated') {
          return true;
        } else {
          let returnUrl: string | undefined = state.url; // Use the target URL from RouterStateSnapshot
          console.log("Redirecting to auth page since user is not authenticated. returnUrl:", returnUrl);

          if (returnUrl == "/") {
            returnUrl = undefined; // Dont include only / for a cleaner url
          }

          this.router.navigate(['/login'], {
            queryParams: { returnUrl: returnUrl },
          });
          return false;
        }
      })
    );
  }
}
