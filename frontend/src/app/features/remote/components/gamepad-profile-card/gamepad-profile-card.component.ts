import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { GamepadProfile } from '../../../../core/services/api/gamepad-api.service';

@Component({
  selector: 'app-gamepad-profile-card',
  standalone: false,
  templateUrl: './gamepad-profile-card.component.html',
  styleUrl: './gamepad-profile-card.component.scss'
})
export class GamepadProfileCardComponent {
  private readonly router = inject(Router);

  public readonly profile = input.required<GamepadProfile>();
  public readonly active = input(false);

  public readonly activateRequested = output<GamepadProfile>();

  protected navigateToEditor(): void {
    this.router.navigate(['/remote/gamepad/profile', this.profile().id]);
  }
}
