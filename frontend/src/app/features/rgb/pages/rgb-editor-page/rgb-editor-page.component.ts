import { Component, OnDestroy, OnInit } from '@angular/core';
import { RgbApiService, RgbEffectInfo, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError } from 'rxjs';
import { SocketService } from '../../../../core/services/socket/socket.service';
import { SocketMessageType } from '../../../../core/services/socket/data/SocketMessageType';

@Component({
  selector: 'app-rgb-editor-page',
  templateUrl: './rgb-editor-page.component.html',
  styleUrl: './rgb-editor-page.component.scss'
})
export class RgbEditorPageComponent implements OnInit, OnDestroy {
  scene: RgbScene | null = null;
  sceneName: string = "";
  availableEffects: RgbEffectInfo[] = [];
  selectedEffectToAdd: string = "";

  addEffect() {
    if (this.selectedEffectToAdd.trim().length == 0) {
      return;
    }

    if (this.scene == null) {
      return;
    }

    this.rgbApi.addEffect(this.scene.id, this.selectedEffectToAdd, "New " + this.selectedEffectToAdd)
      .pipe(catchError(err => {
        this.toastr.error("Failed to add effect");
        throw err;
      })).subscribe(() => {
        this.toastr.info("Added new effect");
        this.refresh();
      });
  }

  constructor(
    private rgbApi: RgbApiService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private socket: SocketService,
  ) { }

  get effects() {
    if (this.scene == null) {
      return [];
    }
    return this.scene.effects;
  }

  back() {
    this.router.navigate(["/rgb"]);
  }

  onNameChanged() {
    this.updateSceneData();
  }

  updateSceneData() {
    if (this.scene == null) {
      return;
    }

    this.rgbApi.saveSceneData(this.scene.id, {
      name: this.sceneName
    }).pipe(catchError(err => {
      this.toastr.error("Failed to save changes");
      throw err;
    })).subscribe(() => { });
  }

  deleteScene() {
    if (!confirm("Do you really want to delete this scene")) {
      return;
    }

    if (this.scene == null) {
      return;
    }
    this.rgbApi.deleteScene(this.scene.id).pipe(catchError(err => {
      this.toastr.error("Failed to delete scene");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Scene deleted");
      this.router.navigate(["/rgb"]);
    });
  }

  refresh() {
    if (this.scene == null) {
      return;
    }

    this.rgbApi.getScene(this.scene.id).pipe(catchError(err => {
      this.toastr.error("Failed to refresh scene data");
      this.router.navigate(["/rgb"]);
      throw err;
    })).subscribe((scene) => {
      this.sceneName = scene.name;
      this.scene = scene;
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = String(params['id']);

      this.rgbApi.getEffects().pipe(catchError(err => {
        this.toastr.error("Failed to fetch effect list");
        throw err;
      })).subscribe((effects) => {
        this.availableEffects = effects;
        console.log("Available effects: " + this.availableEffects.map(e => e.name).join(", "));
        if (this.availableEffects.length > 0) {
          this.selectedEffectToAdd = this.availableEffects[0].name;
        }
      });

      this.rgbApi.getScene(id).pipe(catchError(err => {
        this.toastr.error("Failed to fetch scene info");
        this.router.navigate(["/rgb"]);
        throw err;
      })).subscribe((scene) => {
        console.log(scene);
        this.sceneName = scene.name;
        this.scene = scene;
        this.rgbApi.activateScene(this.scene.id).pipe(catchError(err => {
          this.toastr.error("Failed to activate scene for preview");
          throw err;
        })).subscribe(() => {
          this.toastr.info("Activated the scene for preview");
        });
      });
    });
    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, true);
  }

  ngOnDestroy(): void {
    this.socket.sendMessage(SocketMessageType.C2S_EnableRgbPreview, false);
  }
}
