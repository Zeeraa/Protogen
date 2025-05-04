import { Component, OnDestroy, OnInit } from '@angular/core';
import { App, AppsApi } from '../../../../core/services/api/apps-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-apps-page',
  standalone: false,
  templateUrl: './apps-page.component.html',
  styleUrl: './apps-page.component.scss'
})
export class AppsPageComponent implements OnInit, OnDestroy {
  protected apps: App[] = [];
  protected activeApp: App | null = null;
  private interval: any = null;

  constructor(
    private appsApi: AppsApi,
    private toastr: ToastrService,
  ) { }

  ngOnInit(): void {
    this.loadApps();
    this.interval = setInterval(() => {
      this.getOpenApp();
    }, 2500);
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }

  private loadApps() {
    this.appsApi.getApps().pipe(catchError(err => {
      this.toastr.error("Error loading apps");
      throw err;
    })).subscribe(appList => {
      this.activeApp = appList.activeApp;
      this.apps = appList.apps;
    });
  }

  private getOpenApp() {
    this.appsApi.getActiveApp().subscribe(activeApp => {
      console.log(activeApp);
    })
  }

  protected appActivated(app: App) {
    this.activeApp = app;
  }

  closeActiveApp() {
    this.appsApi.deactivateApp().pipe(
      catchError(err => {
        this.toastr.error("Failed to close app");
        throw err;
      }),
    ).subscribe(result => {
      if (result == true) {
        this.toastr.success("App closed");
        this.activeApp = null;
      }
    });
  }
}
