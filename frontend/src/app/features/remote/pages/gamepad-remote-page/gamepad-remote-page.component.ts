import { Component, OnInit, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ControllerType, GamepadApiService, GamepadSettings } from '../../../../core/services/api/gamepad-api.service';
import { catchError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { form } from '@angular/forms/signals';

@Component({
  selector: 'app-gamepad-remote-page',
  templateUrl: './gamepad-remote-page.component.html',
  styleUrl: './gamepad-remote-page.component.scss',
  standalone: false
})
export class GamepadRemotePageComponent implements OnInit {
  private readonly gamepadApi = inject(GamepadApiService);
  private readonly title = inject(Title);
  private readonly toastr = inject(ToastrService);

  protected readonly constollerTypes = signal(Object.values(ControllerType)).asReadonly();
  protected readonly settingsVisible = signal(false);
  protected readonly settings = signal<GamepadSettings>({
    type: ControllerType.PLAYSTATION,
    enablePreview: true,
  });
  protected readonly settingsForm = form(this.settings);

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
  }
}

