import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (req.url.startsWith(environment.apiUrl) && this.auth.token != null) {
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${this.auth.token}`,
        },
      });

      return next.handle(clonedRequest);
    }

    return next.handle(req);
  }
}
