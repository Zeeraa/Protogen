import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActionApiService, ActionSet } from '../../../../core/services/api/action-api.service';
import { FaceApiService, FaceColorEffect, FaceExpression } from '../../../../core/services/api/face-api.service';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { OverviewApiService, OverviewData } from '../../../../core/services/api/overview-api.service';
import { HudApiService } from '../../../../core/services/api/hud-api.service';
import { BoopSensorApiService, BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';
import { VisorApiService, VisorRenderer } from '../../../../core/services/api/visor-api.service';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { ToastrService } from 'ngx-toastr';
import { catchError, of, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  standalone: false
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly title = inject(Title);
  private readonly toastr = inject(ToastrService);
  private readonly actionApi = inject(ActionApiService);
  private readonly faceApi = inject(FaceApiService);
  private readonly rgbApi = inject(RgbApiService);
  private readonly overviewApi = inject(OverviewApiService);
  private readonly hudApi = inject(HudApiService);
  private readonly boopApi = inject(BoopSensorApiService);
  private readonly visorApi = inject(VisorApiService);
  private readonly socket = inject(SocketService);

  private socketSubscription?: Subscription;

  protected readonly overview = signal<OverviewData | null>(null);
  protected readonly actions = signal<ActionSet[]>([]);
  protected readonly renderers = signal<VisorRenderer[]>([]);
  protected readonly expressions = signal<FaceExpression[]>([]);
  protected readonly rgbScenes = signal<RgbScene[]>([]);
  protected readonly faceRgbEffects = signal<FaceColorEffect[]>([]);
  protected readonly boopProfiles = signal<BoopSensorProfile[]>([]);

  protected readonly dashboardActions = computed(() => this.actions().filter(a => a.showOnDashboard));
  protected readonly activeExpressionId = computed(() => this.overview()?.expression?.id ?? null);
  protected readonly activeRendererId = computed(() => this.overview()?.renderer?.id ?? null);
  protected readonly activeFaceRgbId = computed(() => this.overview()?.faceRgbEffect?.id ?? null);
  protected readonly activeRgbSceneId = computed(() => this.overview()?.rgbEffect?.id ?? null);
  protected readonly boopSensorEnabled = computed(() => this.overview()?.boopSensorEnabled ?? false);
  protected readonly activeBoopProfileId = computed(() => this.overview()?.boopSensorProfile?.id ?? null);

  ngOnInit(): void {
    this.title.setTitle("Dashboard - Protogen");
    this.loadData();

    this.socketSubscription = this.socket.messageObservable.subscribe(msg => {
      if (msg.type === SocketMessageType.S2C_Overview) {
        this.overview.set(msg.data as OverviewData);
      }
    });
  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }

  private loadData(): void {
    this.overviewApi.getOverview().pipe(
      catchError(err => {
        console.error("Failed to load overview", err);
        this.toastr.error("Failed to load overview");
        return [];
      })
    ).subscribe(data => this.overview.set(data));

    this.actionApi.getActionSets().pipe(
      catchError(err => {
        console.error("Failed to load actions", err);
        this.toastr.error("Failed to load actions");
        return [];
      })
    ).subscribe(actions => this.actions.set(actions));

    this.visorApi.getRenderers().pipe(
      catchError(err => {
        console.error("Failed to load renderers", err);
        this.toastr.error("Failed to load renderers");
        return [];
      })
    ).subscribe(renderers => this.renderers.set(renderers));

    this.faceApi.getExpressions().pipe(
      catchError(err => {
        console.error("Failed to load expressions", err);
        this.toastr.error("Failed to load expressions");
        return [];
      })
    ).subscribe(expressions => this.expressions.set(expressions));

    this.rgbApi.getScenes().pipe(
      catchError(err => {
        console.error("Failed to load RGB scenes", err);
        this.toastr.error("Failed to load RGB scenes");
        return [];
      })
    ).subscribe(scenes => this.rgbScenes.set(scenes));

    this.faceApi.getFaceColorEffects().pipe(
      catchError(err => {
        console.error("Failed to load face color effects", err);
        this.toastr.error("Failed to load face color effects");
        return [];
      })
    ).subscribe(effects => this.faceRgbEffects.set(effects));

    this.boopApi.getProfiles().pipe(
      catchError(err => {
        console.error("Failed to load boop profiles", err);
        this.toastr.error("Failed to load boop profiles");
        return [];
      })
    ).subscribe(profiles => this.boopProfiles.set(profiles));
  }

  protected activateAction(action: ActionSet): void {
    this.actionApi.activateActionSet(action.id).pipe(
      catchError(err => {
        console.error("Failed to activate action", err);
        this.toastr.error("Failed to activate action");
        return [];
      })
    ).subscribe();
  }

  protected activateRenderer(renderer: VisorRenderer): void {
    this.visorApi.activateRenderer(renderer.id).pipe(
      catchError(err => {
        console.error("Failed to activate renderer", err);
        this.toastr.error("Failed to activate renderer");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, renderer: { id: renderer.id, name: renderer.name } } : o);
    });
  }

  protected activateExpression(expression: FaceExpression): void {
    this.faceApi.activateExpression(expression.data.uuid, true).pipe(
      catchError(err => {
        console.error("Failed to activate expression", err);
        this.toastr.error("Failed to activate expression");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, expression: { id: expression.data.uuid, name: expression.data.name } } : o);
    });
  }

  protected activateRgbScene(scene: RgbScene): void {
    this.rgbApi.activateScene(scene.id).pipe(
      catchError(err => {
        console.error("Failed to activate RGB scene", err);
        this.toastr.error("Failed to activate RGB scene");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, rgbEffect: { id: scene.id, name: scene.name } } : o);
    });
  }

  protected disableRgb(): void {
    this.rgbApi.deactivate().pipe(
      catchError(err => {
        console.error("Failed to disable RGB", err);
        this.toastr.error("Failed to disable RGB");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, rgbEffect: null } : o);
    });
  }

  protected activateFaceRgb(effect: FaceColorEffect): void {
    this.faceApi.activateColorEffect(effect.id).pipe(
      catchError(err => {
        console.error("Failed to activate face RGB effect", err);
        this.toastr.error("Failed to activate face RGB effect");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, faceRgbEffect: { id: effect.id, name: effect.name } } : o);
    });
  }

  protected disableFaceRgb(): void {
    this.faceApi.activateColorEffect(null).pipe(
      catchError(err => {
        console.error("Failed to disable face RGB", err);
        this.toastr.error("Failed to disable face RGB");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, faceRgbEffect: null } : o);
    });
  }

  protected toggleHud(): void {
    const newState = !(this.overview()?.hudEnabled ?? false);
    this.hudApi.setHudEnabled(newState).pipe(
      catchError(err => {
        console.error("Failed to toggle HUD", err);
        this.toastr.error("Failed to toggle HUD");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, hudEnabled: newState } : o);
    });
  }

  protected toggleBoopSensor(): void {
    const newState = !(this.overview()?.boopSensorEnabled ?? false);
    this.boopApi.setEnabled(newState).pipe(
      catchError(err => {
        console.error("Failed to toggle boop sensor", err);
        this.toastr.error("Failed to toggle boop sensor");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, boopSensorEnabled: newState } : o);
    });
  }

  protected activateBoopProfile(profile: BoopSensorProfile): void {
    this.boopApi.activateProfile(profile.id).pipe(
      catchError(err => {
        console.error("Failed to activate boop profile", err);
        this.toastr.error("Failed to activate boop profile");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, boopSensorProfile: { id: profile.id, name: profile.name } } : o);
    });
  }

  protected deactivateBoopProfile(): void {
    this.boopApi.deactivateProfile().pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status == 404) {
          return of(null);
        }
        console.error("Failed to deactivate boop profile", err);
        this.toastr.error("Failed to deactivate boop profile");
        return [];
      })
    ).subscribe(() => {
      this.overview.update(o => o ? { ...o, boopSensorProfile: null } : o);
    });
  }
}
