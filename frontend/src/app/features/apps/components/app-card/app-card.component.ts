import { Component, Input } from '@angular/core';
import { App } from '../../../../core/services/api/apps-api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-app-card', // Peak naming scheme :3
  standalone: false,
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.scss'
})
export class AppCardComponent {
  @Input({ required: true }) app!: App;

  constructor(
    private toastr: ToastrService,
  ) { }

  public startApp() {
    this.toastr.info("Start function"); // TODO: api call
  }
}
