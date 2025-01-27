import { Component, OnDestroy, OnInit } from '@angular/core';
import { RemoteApiService, RemoteProfile } from '../../../../core/services/api/remote-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, forkJoin } from 'rxjs';
import { VisorApiService, VisorRenderer } from '../../../../core/services/api/visor-api.service';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { SavedVideo, VideoPlayerApiService } from '../../../../core/services/api/video-player-api.service';

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

  constructor(
    private remoteApi: RemoteApiService,
    private toastr: ToastrService,
    private videoApi: VideoPlayerApiService,
    private visorApi: VisorApiService,
    private rgbApi: RgbApiService,
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

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {

  }
}

export interface RemoteActionDataSet {
  visorRenderers: VisorRenderer[];
  rgbScenes: RgbScene[];
  savedVideos: SavedVideo[];
}
