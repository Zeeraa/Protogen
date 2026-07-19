import { AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavbarService } from '../../../../core/services/navbar.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { SystemConfigService } from '../../../../core/services/system-config.service';
import { uuidv4 } from 'uuidv7';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly navbarService = inject(NavbarService);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly http = inject(HttpClient);
  protected readonly systemConfig = inject(SystemConfigService);
  protected readonly randomId = signal(uuidv4()).asReadonly();

  protected readonly isTogglerVisible = signal(false);
  protected readonly iconAvailable = signal(false);

  private readonly navbarElement = viewChild.required<ElementRef<HTMLElement>>("protogen_navbar");
  private iconRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  protected onNavbarExpanded() {
    console.log("Navbar expanded");
    this.navbarService.sizeChanged();
  }

  protected onNavbarCollapsed() {
    console.log("Navbar collapsed");
    this.navbarService.sizeChanged();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.checkTogglerVisibility();
  }

  protected get showLoggedInOptions() {
    return this.auth.loggedIn && !this.auth.loginNeeded;
  }

  protected get isAdminUser() {
    return this.auth.authDetails?.isSuperUser === true;
  }

  protected toggleTheme() {
    this.theme.toggleTheme();
  }

  protected get themeString() {
    return String(this.theme.theme());
  }

  protected checkTogglerVisibility() {
    // Bootstrap breakpoint for `navbar-expand-lg` is 992px
    const currentWidth = window.innerWidth;
    if (currentWidth < 992) {
      if (!this.isTogglerVisible()) {
        this.isTogglerVisible.set(true);
        console.log("Navbar toggler hidden");
        this.navbarService.sizeChanged();
      }
    } else if (this.isTogglerVisible()) {
      this.isTogglerVisible.set(false);
      console.log("Navbar toggler visible");
      this.navbarService.sizeChanged();
    }
  }

  protected logout() {
    this.auth.logout();
  }

  private probeIcon() {
    const url = `/api/images/icon/icon.png?random=${uuidv4()}`;
    this.http.get(url, { responseType: 'blob' }).pipe(catchError(() => of(null))).subscribe(result => {
      if (result !== null) {
        console.log("probeIcon() succeeded, icon is available");
        this.iconAvailable.set(true);
      } else {
        console.log("probeIcon() failed, retrying in 5 seconds...");
        this.iconRetryTimeout = setTimeout(() => this.probeIcon(), 5000);
      }
    });
  }

  ngOnInit(): void {
    this.probeIcon();
  }

  ngAfterViewInit(): void {
    this.navbarService.setup(this.navbarElement().nativeElement);
  }

  ngOnDestroy(): void {
    if (this.iconRetryTimeout !== null) {
      clearTimeout(this.iconRetryTimeout);
      this.iconRetryTimeout = null;
    }
  }
}
