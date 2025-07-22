import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { JoystickRemoteApiService, JoystickRemoteProfile } from '../../../../core/services/api/joystick-remote-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { VisorApiService, } from '../../../../core/services/api/visor-api.service';
import { RgbApiService } from '../../../../core/services/api/rgb-api.service';
import { VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { typeAssert } from '../../../../core/services/utils/Utils';
import { FaceApiService } from '../../../../core/services/api/face-api.service';
import { ActionDataSet } from '../../../../core/interfaces/ActionDataSet';
import { blankJoystickRemoteState, JoystickRemoteState } from '../../../../core/interfaces/JoystickRemoteState';
import { ActionApiService } from '../../../../core/services/api/action-api.service';

@Component({
  selector: 'app-joystick-remote-settings-page',
  templateUrl: './joystick-remote-settings-page.component.html',
  styleUrl: './joystick-remote-settings-page.component.scss',
  standalone: false
})
export class JoystickRemoteSettingsPageComponent implements OnInit, OnDestroy {
  profiles: JoystickRemoteProfile[] = [];
  actionDataSet: ActionDataSet = {
    rgbScenes: [],
    savedVideos: [],
    visorRenderers: [],
    expressions: [],
    faceColorEffects: [],
    actionSets: [],
  }

  remoteState: JoystickRemoteState = blankJoystickRemoteState();
  private socketSubscription: Subscription | null = null;

  private newProfilePrompt: NgbModalRef | null = null;
  @ViewChild("newProfilePrompt") private newProfilePromptTemplate!: TemplateRef<any>;
  newProfileForm = new FormGroup({
    name: new FormControl<string>(""),
  });
  nameEmpty = false;
  nameTaken = false;
  lockInputs = false;

  constructor(
    private remoteApi: JoystickRemoteApiService,
    private toastr: ToastrService,
    private videoApi: VideoPlayerApiService,
    private visorApi: VisorApiService,
    private rgbApi: RgbApiService,
    private modal: NgbModal,
    private title: Title,
    private socket: SocketService,
    private faceApi: FaceApiService,
    private actionApi: ActionApiService,
  ) { }

  loadData() {
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

  loadProfiles() {
    this.remoteApi.getProfiles().pipe(catchError(err => {
      this.toastr.error("Failed to fetch profiles");
      throw err;
    })).subscribe(profiles => {
      this.profiles = profiles;
      console.debug("Loaded profiles:", this.profiles);
    });
  }

  openProfileCreationModal() {
    this.newProfileForm.get("name")?.setValue("");
    this.nameEmpty = false;
    this.nameTaken = false;
    this.lockInputs = false;
    this.newProfilePrompt?.close();
    this.newProfilePrompt = this.modal.open(this.newProfilePromptTemplate);
  }

  profileDeleted(profile: JoystickRemoteProfile) {
    this.profiles = this.profiles.filter(p => p.id != profile.id);
  }

  confirmCreateProfile() {
    const name = this.newProfileForm.get("name")?.value || "";
    if (name.trim().length == 0) {
      this.nameEmpty = true;
      this.toastr.error("Name can not be empty");
      return;
    }

    this.lockInputs = true;
    this.remoteApi.createProfile({ actions: [], name, clickToActivate: false }).pipe(
      catchError((err: HttpErrorResponse) => {
        this.lockInputs = false;

        if (err.status == 409) {
          this.toastr.error("Name already in use by other profile");
          this.nameTaken = true;
          return of(null);
        }

        this.toastr.error("Failed to create profile");
        throw err;
      })
    ).subscribe(profile => {
      if (profile == null) {
        return;
      }
      this.lockInputs = false;
      this.newProfilePrompt?.close();
      this.toastr.success("Profile created");
      this.profiles.push(profile);
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.title.setTitle("Remote - Protogen");

    this.socketSubscription = this.socket.messageObservable.subscribe((msg) => {
      if (msg.type == SocketMessageType.S2C_JoystickRemoteState) {
        this.remoteState = typeAssert<JoystickRemoteState>(msg.data);
      }
    });
    this.loadProfiles();
  }

  ngOnDestroy(): void {
    this.newProfilePrompt?.close();
    this.socketSubscription?.unsubscribe();
  }
}
