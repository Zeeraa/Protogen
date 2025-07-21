import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { BoopSensorApiService, BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';
import { catchError, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

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

  protected boopCount = 0;
  protected enabled = false;
  protected showOnHud = false;

  constructor(
    private boopSensorApi: BoopSensorApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private router: Router,
    private title: Title,
  ) { }

  protected profileActivated(profile: BoopSensorProfile) {
    this.activeProfileId = profile.id;
  }

  protected setEnabled(enabled: boolean) {
    this.boopSensorApi.setEnabled(enabled).pipe(catchError((err: HttpErrorResponse) => {
      console.error('Failed to set enabled state', err);
      this.toastr.error("Failed to " + (enabled ? "enable" : "disable") + " sensor");
      return [];
    })).subscribe(result => {
      this.enabled = result.enabled;
    });
  }

  protected resetCounter() {
    this.boopSensorApi.resetCounter().pipe(catchError((err: HttpErrorResponse) => {
      console.error('Failed to reset counter', err);
      this.toastr.error("Failed to reset counter");
      return [];
    })).subscribe(() => {
      this.toastr.success("Counter reset");
      this.boopCount = 0;
    });
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

  protected setShowOnHud(state: boolean) {
    this.boopSensorApi.setShowOnHud(state).pipe(catchError((err: HttpErrorResponse) => {
      console.error('Failed to set show on HUD', err);
      this.toastr.error("Failed to set show on HUD state");
      return [];
    })).subscribe(result => {
      this.showOnHud = result.showOnHud;
    });
  }

  ngOnInit(): void {
    this.title.setTitle("Boop Sensor - Protogen");

    this.boopSensorApi.getProfiles().pipe(catchError((err) => {
      console.error('Failed to load Boop Sensor profiles', err);
      this.toastr.error("Failed to load profiles");
      return [];
    })).subscribe(profiles => {
      this.profiles = profiles;
    });

    this.fetchData();

    this.updateInterval = setInterval(() => {
      this.fetchData();
    }, 5000);
  }

  ngOnDestroy(): void {
    clearInterval(this.updateInterval);
    this.newProfilePrompt?.close();
  }

  protected fetchData() {
    this.boopSensorApi.getData().pipe(catchError((err: HttpErrorResponse) => {
      console.error('Failed to fetch data', err);
      return [];
    })).subscribe(data => {
      this.boopCount = data.boopCounter;
      this.enabled = data.enabled;
      this.activeProfileId = data.activeProfileId ?? null;
      this.showOnHud = data.showOnHud;
    });
  }
}
