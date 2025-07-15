import { Component, OnDestroy, OnInit } from '@angular/core';
import { BoopSensorAction, BoopSensorApiService, BoopSensorProfile } from '../../../../core/services/api/boop-sensor-api.service';
import { catchError, forkJoin, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';
import { FaceApiService } from '../../../../core/services/api/face-api.service';
import { VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';
import { VisorApiService } from '../../../../core/services/api/visor-api.service';
import { RgbApiService } from '../../../../core/services/api/rgb-api.service';
import { uuidv7 } from 'uuidv7';
import { ActionType } from '../../../../core/enum/ActionType';
import { ActionApiService } from '../../../../core/services/api/action-api.service';

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
  protected isSaving = false;
  protected profile: BoopSensorProfile | null = null;

  protected actionDataSet: ActionDataSet = {
    rgbScenes: [],
    savedVideos: [],
    visorRenderers: [],
    expressions: [],
    faceColorEffects: [],
    actionSets: [],
  }

  constructor(
    private boopSensorApi: BoopSensorApiService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private rgbApi: RgbApiService,
    private visorApi: VisorApiService,
    private videoApi: VideoPlayerApiService,
    private faceApi: FaceApiService,
    private actionApi: ActionApiService,
  ) { }

  loadActionDataSet() {
    const rgbScenesRequest = this.rgbApi.getScenes();
    const visorRenderersRequest = this.visorApi.getRenderers();
    const videosRequest = this.videoApi.getSavedVideos();
    const faceExpressionsRequest = this.faceApi.getExpressions();
    const faceColorEffectsRequest = this.faceApi.getFaceColorEffects();
    const actionSetsRequest = this.actionApi.getActionSets();

    forkJoin([rgbScenesRequest, visorRenderersRequest, videosRequest, faceExpressionsRequest, faceColorEffectsRequest, actionSetsRequest]).subscribe({
      next: ([rgbScenes, visorRenderers, videos, faceExpressions, faceColorEffects, actionSets]) => {
        this.actionDataSet = {
          rgbScenes: rgbScenes,
          savedVideos: videos,
          visorRenderers: visorRenderers,
          expressions: faceExpressions,
          faceColorEffects: faceColorEffects,
          actionSets: actionSets,
        }
        console.log(this.actionDataSet);
        console.log("Action dataset loaded");
      },
      error: (err) => {
        this.toastr.error("Failed fetch action target data. Editor will not fully function");
        console.error('Error occurred:', err);
      },
    });
  }

  protected saveChanges() {
    if (this.profile == null) {
      console.error("Profile is null, cannot save changes");
      return;
    }

    this.isSaving = true;
    this.boopSensorApi.updateProfile(this.profile).pipe(catchError((err: HttpErrorResponse) => {
      this.toastr.error("Failed to save profile changes");
      console.error('Failed to save profile changes', err);
      this.isSaving = false;
      return [];
    })).subscribe(profile => {
      this.profile = profile;
      this.isSaving = false;
      this.toastr.success("Profile changes saved successfully");
    })
  }

  protected deleteAction(action: BoopSensorAction) {
    if (this.profile == null) {
      return;
    }

    this.profile.actions = this.profile.actions.filter(a => {
      if (a.id != null) {
        return a.id !== action.id;
      } else {
        return a.virtualId !== action.virtualId;
      }
    });
  }

  protected addBlankAction() {
    if (this.profile == null) {
      return;
    }
    const newAction: BoopSensorAction = {
      id: undefined,
      virtualId: uuidv7(),
      triggerAtValue: 1,
      actionType: ActionType.NONE,
      action: '',
      triggerMultipleTimes: false,
      incrementCounterOnFailedCondition: false,
    };
    this.profile.actions.push(newAction);
  }

  ngOnInit(): void {
    this.loadActionDataSet();
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
