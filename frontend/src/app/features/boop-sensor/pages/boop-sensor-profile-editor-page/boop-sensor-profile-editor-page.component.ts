import { Component, OnDestroy, OnInit } from '@angular/core';
import { BoopSensorApiService, BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';
import { catchError, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-boop-sensor-profile-editor-page',
  standalone: false,
  templateUrl: './boop-sensor-profile-editor-page.component.html',
  styleUrl: './boop-sensor-profile-editor-page.component.scss'
})
export class BoopSensorProfileEditorPageComponent implements OnInit, OnDestroy {
  private fetchSubscription?: Subscription;

  protected loading = true;
  protected loadError = false;
  protected profile: BoopSensorProfile | null = null;

  constructor(
    private boopSensorApi: BoopSensorApiService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = String(params['id']);
      this.fetchSubscription = this.boopSensorApi.getProfileById(id).pipe(catchError((err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 404) {
          this.toastr.error("Profile not found");
          console.error('Profile not found');
          this.loading = false;
          return [];
        }

        console.error('Failed to load profile', err);
        this.loadError = true;
        return [];
      })).subscribe(profile => {
        this.loading = false;
        this.profile = profile;
      });
    });
  }

  ngOnDestroy(): void {
    this.fetchSubscription?.unsubscribe();
  }
}
