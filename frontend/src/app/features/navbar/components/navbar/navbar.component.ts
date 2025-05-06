import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NavbarService } from '../../../../core/services/navbar.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  standalone: false
})
export class NavbarComponent implements AfterViewInit {
  isTogglerVisible = false;

  @ViewChild("protogen_navbar")
  private navbarElement!: ElementRef<HTMLElement>;

  onNavbarExpanded() {
    console.log("Navbar expanded");
    this.navbarService.sizeChanged();
  }

  onNavbarCollapsed() {
    console.log("Navbar collapsed");
    this.navbarService.sizeChanged();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.checkTogglerVisibility();
  }

  get showLoggedInOptions() {
    return this.auth.loggedIn && !this.auth.loginNeeded;
  }

  checkTogglerVisibility() {
    // Bootstrap breakpoint for `navbar-expand-lg` is 992px
    const currentWidth = window.innerWidth;
    if (currentWidth < 992) {
      if (!this.isTogglerVisible) {
        this.isTogglerVisible = true;
        console.log("Navbar toggler hidden");
        this.navbarService.sizeChanged();
      }
    } else if (this.isTogglerVisible) {
      this.isTogglerVisible = false;
      console.log("Navbar toggler visible");
      this.navbarService.sizeChanged();
    }
  }

  logout() {
    this.auth.logout();
  }

  ngAfterViewInit(): void {
    this.navbarService.setup(this.navbarElement.nativeElement);
  }

  constructor(
    private navbarService: NavbarService,
    private auth: AuthService,
  ) { }
}
