import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActionApiService, ActionSet } from '../../../../core/services/api/action-api.service';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  standalone: false
})
export class DashboardPageComponent implements OnInit {
  actions: ActionSet[] = [];

  constructor(
    private title: Title,
    private actionApi: ActionApiService,
  ) { }

  ngOnInit(): void {
    this.title.setTitle("Dashboard - Protogen");

    this.actionApi.getActionSets().subscribe(actions => {
      this.actions = actions.filter(action => action.showOnDashboard);
    });
  }
}
