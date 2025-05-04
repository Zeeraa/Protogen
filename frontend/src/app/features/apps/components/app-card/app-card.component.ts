import { Component, EventEmitter, Input, Output } from '@angular/core';
import { App, AppsApi } from '../../../../core/services/api/apps-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-app-card', // Peak naming scheme :3
  standalone: false,
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.scss'
})
export class AppCardComponent {
  @Input({ required: true }) app!: App;
  @Input() isActive = false;
  @Output() activated = new EventEmitter<App>();

  constructor(
    private appApi: AppsApi,
    private toastr: ToastrService,
  ) { }

  public startApp() {
    this.appApi.activateApp(this.app.name).pipe(
      catchError(err => {
        this.toastr.error("Failed to start app");
        throw err;
      })
    ).subscribe(() => {
      this.toastr.success("App started");
      this.activated.emit(this.app);
    });
  }
}
