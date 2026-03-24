import { Component, OnDestroy, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ActionType,
  GamepadActionTrigger,
  GamepadApiService,
  GamepadProfile,
  UpdateProfileActionInput,
  translateTriggerName,
} from '../../../../core/services/api/gamepad-api.service';
import { translateActionType } from '../../../../core/enum/ActionType';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';
import { EditableTriggerRow } from '../../components/gamepad-trigger-row/gamepad-trigger-row.component';
import { RgbApiService } from '../../../../core/services/api/rgb-api.service';
import { VisorApiService } from '../../../../core/services/api/visor-api.service';
import { VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';
import { FaceApiService } from '../../../../core/services/api/face-api.service';
import { ActionApiService } from '../../../../core/services/api/action-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-gamepad-profile-editor-page',
  standalone: false,
  templateUrl: './gamepad-profile-editor-page.component.html',
  styleUrl: './gamepad-profile-editor-page.component.scss',
})
export class GamepadProfileEditorPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly toastr = inject(ToastrService);
  private readonly gamepadApi = inject(GamepadApiService);
  private readonly rgbApi = inject(RgbApiService);
  private readonly visorApi = inject(VisorApiService);
  private readonly videoApi = inject(VideoPlayerApiService);
  private readonly faceApi = inject(FaceApiService);
  private readonly actionApi = inject(ActionApiService);
  private readonly modal = inject(NgbModal);

  protected readonly loading = signal(true);
  protected readonly profile = signal<GamepadProfile | null>(null);
  protected readonly notFound = signal(false);

  protected readonly isEditing = signal(false);
  protected readonly saving = signal(false);

  protected readonly editName = signal('');
  protected readonly editRows = signal<EditableTriggerRow[]>([]);

  protected readonly actionDataSet = signal<ActionDataSet | null>(null);

  // Delete
  private deletePrompt: NgbModalRef | null = null;
  private readonly deletePromptTemplate = viewChild.required<TemplateRef<any>>('deletePrompt');
  protected readonly deleting = signal(false);

  protected readonly nonNoneActions = computed(() => {
    const p = this.profile();
    if (p == null) return [];
    return p.actions.filter(a => a.actionType !== ActionType.NONE);
  });

  ngOnInit(): void {
    this.title.setTitle('Gamepad Profile Editor - Protogen');
    const id = this.route.snapshot.paramMap.get('id');
    if (id == null) {
      this.router.navigate(['/remote/gamepad']);
      return;
    }
    this.loadData(id);
  }

  private loadData(id: string): void {
    forkJoin({
      profile: this.gamepadApi.getProfileById(id),
      rgbScenes: this.rgbApi.getScenes(),
      visorRenderers: this.visorApi.getRenderers(),
      savedVideos: this.videoApi.getSavedVideos(),
      expressions: this.faceApi.getExpressions(),
      faceColorEffects: this.faceApi.getFaceColorEffects(),
      actionSets: this.actionApi.getActionSets(),
    }).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('Failed to load profile editor data', err);
        this.toastr.error('Failed to load profile data');
        this.loading.set(false);
        return [];
      })
    ).subscribe(data => {
      this.loading.set(false);
      if (data.profile == null) {
        this.notFound.set(true);
        return;
      }
      this.profile.set(data.profile);
      this.actionDataSet.set({
        rgbScenes: data.rgbScenes,
        visorRenderers: data.visorRenderers,
        savedVideos: data.savedVideos,
        expressions: data.expressions,
        faceColorEffects: data.faceColorEffects,
        actionSets: data.actionSets,
      });
    });
  }

  protected goBack(): void {
    this.router.navigate(['/remote/gamepad']);
  }

  protected startEdit(): void {
    const p = this.profile();
    if (p == null) return;
    this.editName.set(p.name);
    this.editRows.set(
      Object.values(GamepadActionTrigger).map(trigger => {
        const existing = p.actions.find(a => a.trigger === trigger);
        return {
          trigger,
          actionType: existing?.actionType ?? ActionType.NONE,
          action: existing?.action ?? null,
        };
      })
    );
    this.isEditing.set(true);
  }

  protected cancelEdit(): void {
    this.isEditing.set(false);
  }

  protected openDeleteDialog(): void {
    this.deletePrompt?.close();
    this.deletePrompt = this.modal.open(this.deletePromptTemplate());
  }

  protected confirmDelete(): void {
    const p = this.profile();
    if (p == null) return;
    this.deleting.set(true);
    this.gamepadApi.deleteProfile(p.id).pipe(
      catchError((err: HttpErrorResponse) => {
        this.deleting.set(false);
        console.error('Failed to delete profile', err);
        this.toastr.error('Failed to delete profile');
        return [];
      })
    ).subscribe(() => {
      this.deletePrompt?.close();
      this.deleting.set(false);
      this.toastr.success('Profile deleted');
      this.router.navigate(['/remote/gamepad']);
    });
  }

  protected saveProfile(): void {
    const p = this.profile();
    if (p == null) return;

    const name = this.editName().trim();
    if (name.length === 0) {
      this.toastr.warning('Profile name cannot be empty');
      return;
    }

    const actions: UpdateProfileActionInput[] = this.editRows()
      .filter(r => r.actionType !== ActionType.NONE)
      .map(r => ({ trigger: r.trigger, actionType: r.actionType, action: r.action }));

    this.saving.set(true);
    this.gamepadApi.updateProfile(p.id, name, actions).pipe(
      catchError((err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 409) {
          this.toastr.error('A profile with this name already exists');
        } else {
          console.error('Failed to save profile', err);
          this.toastr.error('Failed to save profile');
        }
        return [];
      })
    ).subscribe(updated => {
      this.saving.set(false);
      this.profile.set(updated);
      this.isEditing.set(false);
      this.toastr.success('Profile saved');
    });
  }

  protected translateTrigger(trigger: GamepadActionTrigger): string {
    return translateTriggerName(trigger);
  }

  protected translateAction(actionType: ActionType): string {
    return translateActionType(actionType);
  }

  protected resolveActionValue(actionType: ActionType, value: string | null): string {
    if (value == null) return '-';
    const ds = this.actionDataSet();
    if (ds == null) return value;

    switch (actionType) {
      case ActionType.PLAY_VIDEO:
        return ds.savedVideos.find(v => String(v.id) === value)?.name ?? value;
      case ActionType.ACTIVATE_VISOR_RENDERER:
        return ds.visorRenderers.find(r => r.id === value)?.name ?? value;
      case ActionType.ACTIVATE_RGB_SCENE:
        return ds.rgbScenes.find(s => s.id === value)?.name ?? value;
      case ActionType.FACE_EXPRESSION:
      case ActionType.TEMPORARY_EXPRESSION:
        return ds.expressions.find(e => e.data.uuid === value)?.data.name ?? value;
      case ActionType.ACTIVATE_FACE_RGB_EFFECT:
        return ds.faceColorEffects.find(e => e.id === value)?.name ?? value;
      case ActionType.RUN_ACTION_SET:
        return ds.actionSets.find(a => String(a.id) === value)?.name ?? value;
      default:
        return '-';
    }
  }

  ngOnDestroy(): void {
    this.deletePrompt?.close();
  }
}
