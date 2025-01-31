import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { RemoteApiService, RemoteProfile } from '../../../../core/services/api/remote-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { VisorApiService, VisorRenderer } from '../../../../core/services/api/visor-api.service';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { SavedVideo, VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { blankRemoteState, RemoteState } from '../../interface/RemoteState';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';
import { typeAssert } from '../../../../core/services/utils/Utils';

@Component({
  selector: 'app-remote-settings-page',
  templateUrl: './remote-settings-page.component.html',
  styleUrl: './remote-settings-page.component.scss'
})
export class RemoteSettingsPageComponent implements OnInit, OnDestroy {
  profiles: RemoteProfile[] = [];
  actionDataSet: RemoteActionDataSet = {
    rgbScenes: [],
    savedVideos: [],
    visorRenderers: [],
  }

  remoteState: RemoteState = blankRemoteState();
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
    private remoteApi: RemoteApiService,
    private toastr: ToastrService,
    private videoApi: VideoPlayerApiService,
    private visorApi: VisorApiService,
    private rgbApi: RgbApiService,
    private modal: NgbModal,
    private title: Title,
    private socket: SocketService,
  ) { }

  loadData() {
    const rgbScenesRequest = this.rgbApi.getScenes();
    const visorRenderersRequest = this.visorApi.getRenderers();
    const videosRequest = this.videoApi.getSavedVideos();

    forkJoin([rgbScenesRequest, visorRenderersRequest, videosRequest]).subscribe({
      next: ([rgbScenes, visorRenderers, videos]) => {
        this.actionDataSet = {
          rgbScenes: rgbScenes,
          savedVideos: videos,
          visorRenderers: visorRenderers,
        }
        console.log(this.actionDataSet);
        console.log("Related data loaded. Loading profiles...");
        this.loadProfiles();
      },
      error: (err) => {
        this.toastr.error("Failed fetch action target data");
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

  profileDeleted(profile: RemoteProfile) {
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
      if (msg.type == SocketMessageType.S2C_RemoteState) {
        this.remoteState = typeAssert<RemoteState>(msg.data);
      }
    });
  }

  ngOnDestroy(): void {
    this.newProfilePrompt?.close();
    this.socketSubscription?.unsubscribe();
  }
}

export interface RemoteActionDataSet {
  visorRenderers: VisorRenderer[];
  rgbScenes: RgbScene[];
  savedVideos: SavedVideo[];
}
