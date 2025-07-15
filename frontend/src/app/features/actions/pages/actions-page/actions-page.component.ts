import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActionApiService, ActionSet } from '../../../../core/services/api/action-api.service';
import { catchError, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';
import { RgbApiService } from '../../../../core/services/api/rgb-api.service';
import { VisorApiService } from '../../../../core/services/api/visor-api.service';
import { VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';
import { FaceApiService } from '../../../../core/services/api/face-api.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-actions-page',
  standalone: false,
  templateUrl: './actions-page.component.html',
  styleUrl: './actions-page.component.scss'
})
export class ActionsPageComponent implements OnInit, OnDestroy {
  actionSets: ActionSet[] = [];

  protected newActionForm = new FormGroup({
    name: new FormControl<string>(""),
    showOnDashboard: new FormControl<boolean>(false),
  });
  private newActionModal?: NgbModalRef;
  @ViewChild("newActionModal") private newActionModalTemplate!: TemplateRef<any>;

  protected nameEmpty = false;
  protected nameTaken = false;
  protected lockInputs = false;

  protected actionDataSet: ActionDataSet = {
    rgbScenes: [],
    savedVideos: [],
    visorRenderers: [],
    expressions: [],
    faceColorEffects: [],
    actionSets: [],
  }

  constructor(
    private actionApi: ActionApiService,
    private toastr: ToastrService,
    private modal: NgbModal,
    private videoApi: VideoPlayerApiService,
    private visorApi: VisorApiService,
    private rgbApi: RgbApiService,
    private faceApi: FaceApiService,
    private title: Title,
  ) { }

  openNewModal() {
    this.newActionForm.reset();
    this.newActionModal?.close();
    this.newActionModal = this.modal.open(this.newActionModalTemplate);
  }

  confirmCreateAction() {
    this.nameEmpty = false;
    this.nameTaken = false;

    const name = this.newActionForm.get("name")?.value;
    if (name == null || name.trim() === "") {
      this.nameEmpty = true;
      return;
    }

    const showOnDashboard = this.newActionForm.get("showOnDashboard")?.value || false;

    this.lockInputs = true;
    this.actionApi.createActionSet(name, showOnDashboard).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;
        if (err.status === 409) {
          this.nameTaken = true;
          this.toastr.error("Name already in use by another action");
        } else {
          console.error("Failed to create action", err);
          this.toastr.error("Failed to create action");
        }
        throw err;
      })
    ).subscribe(actionSet => {
      this.lockInputs = false;
      this.newActionModal?.close();
      this.toastr.success("Action created");
      this.actionSets.push(actionSet);
    });
  }

  private initialLoad() {
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
        console.log("Related data loaded. Loading actions...");
        this.fetchData();
      },
      error: (err) => {
        this.toastr.error("Failed fetch action target data");
        console.error('Error occurred:', err);
      },
    });
  }

  ngOnDestroy(): void {
    this.newActionModal?.close();
  }

  ngOnInit(): void {
    this.title.setTitle("Actions - Protogen");
    this.initialLoad();
  }

  protected actionSetDeleted(actionSet: ActionSet) {
    this.actionSets = this.actionSets.filter(as => as.id !== actionSet.id);
  }

  protected undoEdit(actionSet: ActionSet) {
    this.actionApi.getActionSets().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch actions");
        console.error("Failed to fetch actions", err);
        return [];
      })
    ).subscribe(actionSets => {
      const original = actionSets.find(as => as.id === actionSet.id);
      if (original == null) {
        console.error("Could not revert changes since the opriginal could not be found");
        return;
      }
      const index = this.actionSets.indexOf(actionSet);
      this.actionSets[index] = original
    });
  }

  fetchData() {
    this.actionApi.getActionSets().pipe(
      catchError(err => {
        this.toastr.error("Failed to fetch actions");
        console.error("Failed to fetch actions", err);
        return [];
      })
    ).subscribe(actionSets => {
      this.actionSets = actionSets;
    })
  }
}
