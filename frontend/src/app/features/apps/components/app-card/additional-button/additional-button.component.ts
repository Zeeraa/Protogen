import { Component, computed, inject, input, output } from '@angular/core';
import { App, AppAdditionalButton, AppAdditionalButtonEnableRule, AppsApi } from '../../../../../core/services/api/apps-api.service';
import { catchError } from 'rxjs';
import { ToastService } from 'ngx-yet-another-toast-library';

@Component({
  selector: 'app-additional-button',
  standalone: false,
  styleUrl: './additional-button.component.scss',
  templateUrl: './additional-button.component.html',
})
export class AdditionalButtonComponent {
  private readonly appApi = inject(AppsApi);
  private readonly toast = inject(ToastService);

  public readonly app = input.required<App>();
  public readonly additionalButton = input.required<AppAdditionalButton>();
  public readonly appIsRunning = input.required<boolean>();

  public readonly appActivated = output<App>();

  protected readonly isDisabled = computed(() => {
    const enableRule = this.additionalButton().enableRule;
    const isRunning = this.appIsRunning();

    if (enableRule === AppAdditionalButtonEnableRule.Always) {
      return false;
    }

    if (enableRule === AppAdditionalButtonEnableRule.WhenActive) {
      return !isRunning;
    }

    if (enableRule === AppAdditionalButtonEnableRule.WhenInactive) {
      return isRunning;
    }

    return true;
  });

  protected handleAdditionalButtonClick(additionalButton: AppAdditionalButton) {
    if (additionalButton.type === "StartWithParams") {
      this.startApp(additionalButton.metadata ?? {});
    }
  }

  public startApp(params = {}) {
    this.appApi.activateApp(this.app().name, params).pipe(
      catchError(err => {
        this.toast.error("Failed to start app");
        throw err;
      })
    ).subscribe(() => {
      this.toast.success("App started");
      this.appActivated.emit(this.app());
    });
  }
}
