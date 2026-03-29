import { Component, OnDestroy, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ControllerType, GamepadApiService, GamepadProfile, GamepadSettings } from '../../../../core/services/api/gamepad-api.service';
import { catchError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { form } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-gamepad-remote-page',
  templateUrl: './gamepad-remote-page.component.html',
  styleUrl: './gamepad-remote-page.component.scss',
  standalone: false
})
export class GamepadRemotePageComponent implements OnInit, OnDestroy {
  private readonly gamepadApi = inject(GamepadApiService);
  private readonly title = inject(Title);
  private readonly toastr = inject(ToastrService);
  private readonly modal = inject(NgbModal);

  protected readonly constollerTypes = signal(Object.values(ControllerType)).asReadonly();
  protected readonly settingsVisible = signal(false);
  protected readonly settings = signal<GamepadSettings>({
    type: ControllerType.PLAYSTATION,
    enablePreview: true,
  });
  protected readonly settingsForm = form(this.settings);

  protected readonly profiles = signal<GamepadProfile[]>([]);
  protected readonly activeProfileId = signal<string | null>(null);
  protected readonly activeProfile = computed(() =>
    this.profiles().find(p => p.id === this.activeProfileId()) ?? null
  );

  // New profile modal
  private newProfilePrompt: NgbModalRef | null = null;
  private readonly newProfilePromptTemplate = viewChild.required<TemplateRef<any>>("newProfilePrompt");
  protected readonly newProfileName = signal('');
  protected readonly newProfileSaving = signal(false);
  protected readonly newProfileNameEmpty = signal(false);

  protected saveSettings() {
    this.gamepadApi.setSettings(this.settings()).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error("Failed to save gamepad settings", err);
        this.toastr.error("Failed to save gamepad settings");
        return [];
      })
    ).subscribe(settings => {
      this.settings.set(settings);
      this.settingsVisible.set(false);
      this.toastr.success("Gamepad settings saved");
    });
  }

  protected activateProfile(profile: GamepadProfile) {
    this.gamepadApi.activateProfile(profile.id).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error("Failed to activate profile", err);
        this.toastr.error("Failed to activate profile");
        return [];
      })
    ).subscribe(() => {
      this.activeProfileId.set(profile.id);
      this.toastr.success("Profile activated");
    });
  }

  protected deactivateProfile() {
    this.gamepadApi.deactivateProfile().pipe(
      catchError((err: HttpErrorResponse) => {
        console.error("Failed to deactivate profile", err);
        this.toastr.error("Failed to deactivate profile");
        return [];
      })
    ).subscribe(() => {
      this.activeProfileId.set(null);
      this.toastr.success("Profile deactivated");
    });
  }

  protected openNewProfileDialog() {
    this.newProfileName.set('');
    this.newProfileNameEmpty.set(false);
    this.newProfileSaving.set(false);
    this.newProfilePrompt?.close();
    this.newProfilePrompt = this.modal.open(this.newProfilePromptTemplate());
  }

  protected createProfile() {
    this.newProfileNameEmpty.set(false);
    const name = this.newProfileName().trim();
    if (name.length === 0) {
      this.newProfileNameEmpty.set(true);
      return;
    }
    this.newProfileSaving.set(true);
    this.gamepadApi.createProfile(name).pipe(
      catchError((err: HttpErrorResponse) => {
        this.newProfileSaving.set(false);
        console.error("Failed to create profile", err);
        this.toastr.error("Failed to create profile");
        return [];
      })
    ).subscribe(profile => {
      this.newProfilePrompt?.close();
      this.newProfileSaving.set(false);
      this.profiles.update(list => [...list, profile]);
      this.toastr.success("Profile created");
    });
  }

  ngOnInit(): void {
    this.title.setTitle("Remote - Protogen");

    this.gamepadApi.getSettings().pipe(
      catchError((err: HttpErrorResponse) => {
        console.error("Failed to load gamepad settings", err);
        this.toastr.error("Failed to load gamepad settings");
        return [];
      })
    ).subscribe(settings => {
      this.settings.set(settings);
    });

    this.gamepadApi.getProfiles().pipe(
      catchError((err: HttpErrorResponse) => {
        console.error("Failed to load gamepad profiles", err);
        this.toastr.error("Failed to load gamepad profiles");
        return [];
      })
    ).subscribe(profiles => {
      this.profiles.set(profiles);
    });

    this.gamepadApi.getActiveProfile().pipe(
      catchError((err: HttpErrorResponse) => {
        console.error("Failed to load active gamepad profile", err);
        return [];
      })
    ).subscribe(profile => {
      this.activeProfileId.set(profile?.id ?? null);
    });
  }

  ngOnDestroy(): void {
    this.newProfilePrompt?.close();
  }
}
