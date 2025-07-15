import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { BoopSensorApiService, BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';
import { catchError, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';

@Component({
  selector: 'app-boop-sensor-page',
  standalone: false,
  templateUrl: './boop-sensor-page.component.html',
  styleUrl: './boop-sensor-page.component.scss'
})
export class BoopSensorPageComponent implements OnInit, OnDestroy {
  protected profiles: BoopSensorProfile[] = [];
  protected activeProfileId: string | null = null;

  private updateInterval?: any;

  private newProfilePrompt: NgbModalRef | null = null;
  @ViewChild("newProfilePrompt") private newProfilePromptTemplate!: TemplateRef<any>;
  protected newProfileForm = new FormGroup({
    name: new FormControl<string>(""),
  });
  protected newProfileSaving = false;
  protected nameEmpty = false;

  constructor(
    private boopSensorApi: BoopSensorApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private router: Router,
  ) { }

  protected profileActivated(profile: BoopSensorProfile) {
    this.activeProfileId = profile.id;
  }

  protected deactivate() {
    this.boopSensorApi.deactivateProfile().pipe(catchError((err: HttpErrorResponse) => {
      if (err.status === 404) {
        this.toastr.info("No active profile to deactivate");
        return of(null);
      }
      console.error('Failed to deactivate profile', err);
      this.toastr.error("Failed to deactivate profile");
      return [];
    })).subscribe(() => {
      this.toastr.success("Profile deactivated");
      this.activeProfileId = null;
    });
  }

  protected openNewDialog() {
    this.newProfileForm.reset();
    this.newProfilePrompt?.close();
    this.newProfilePrompt = this.modal.open(this.newProfilePromptTemplate, {});
  }

  protected createNewProfile() {
    this.nameEmpty = false;
    const name = this.newProfileForm.get("name")?.value ?? "";
    if (name.trim().length === 0) {
      this.nameEmpty = true;
      return;
    }
    this.newProfileSaving = true;
    this.boopSensorApi.createNewProfile({ name }).pipe(catchError((err: HttpErrorResponse) => {
      this.newProfileSaving = false;
      console.error('Failed to create new profile', err);
      this.toastr.error("Failed to create new profile");
      return [];
    })).subscribe(profile => {
      this.newProfilePrompt?.close();
      this.newProfileSaving = false;
      this.toastr.success("Profile created");
      this.profiles.push(profile);

      this.router.navigate(['/boop-sensor/profile', profile.id]);
    });
  }

  ngOnInit(): void {
    this.boopSensorApi.getProfiles().pipe(catchError((err) => {
      console.error('Failed to load Boop Sensor profiles', err);
      this.toastr.error("Failed to load profiles");
      return [];
    })).subscribe(profiles => {
      this.profiles = profiles;
    });

    this.fetchActiveProfile();

    this.updateInterval = setInterval(() => {
      this.fetchActiveProfile();
    }, 5000);
  }

  ngOnDestroy(): void {
    clearInterval(this.updateInterval);
    this.newProfilePrompt?.close();
  }

  protected fetchActiveProfile() {
    this.boopSensorApi.getActiveProfile().pipe(catchError(err => {
      console.error('Failed to fetch active profile', err);
      return [];
    })).subscribe(profile => {
      this.activeProfileId = profile ? profile.id : null;
    })
  }
}
