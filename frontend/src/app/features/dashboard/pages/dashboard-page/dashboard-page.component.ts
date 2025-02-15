import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActionApiService, ActionSet } from '../../../../core/services/api/action-api.service';
import { FaceApiService, FaceExpression } from '../../../../core/services/api/face-api.service';
import { catchError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  standalone: false
})
export class DashboardPageComponent implements OnInit {
  actions: ActionSet[] = [];
  expressions: FaceExpression[] = [];

  constructor(
    private title: Title,
    private toastr: ToastrService,
    private actionApi: ActionApiService,
    private faceApi: FaceApiService,
  ) { }

  ngOnInit(): void {
    this.title.setTitle("Dashboard - Protogen");

    this.actionApi.getActionSets().pipe(
      catchError(err => {
        this.toastr.error("Failed to load actions");
        throw err;
      })
    ).subscribe(actions => {
      this.actions = actions.filter(action => action.showOnDashboard);
    });

    this.faceApi.getExpressions().pipe(
      catchError(err => {
        this.toastr.error("Failed to load expressions");
        throw err
      })).subscribe(expressions => {
        this.expressions = expressions;
      });
  }
}
