import { Component, OnInit } from '@angular/core';
import { RgbApiService, RgbScene } from '../../../../core/services/api/rgb-api.service';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'app-rgb-dashboard-page',
    templateUrl: './rgb-dashboard-page.component.html',
    styleUrl: './rgb-dashboard-page.component.scss',
    standalone: false
})
export class RgbDashboardPageComponent implements OnInit {
  scenes: RgbScene[] = [];

  constructor(
    private toastr: ToastrService,
    private rgbApi: RgbApiService,
    private title: Title,
  ) { }

  addBlank() {
    this.rgbApi.createNewScene("New scene").pipe(catchError(err => {
      this.toastr.error("Failed to create new scene");
      throw err;
    })).subscribe((scene) => {
      this.scenes.push(scene);
      this.toastr.success("Scene created");
    });
  }

  disable() {
    this.rgbApi.deactivate().pipe(catchError(err => {
      this.toastr.error("Failed to disable rgb");
      throw err;
    })).subscribe(() => {
      this.toastr.success("RGB Disabled");
    });
  }

  loadEffects() {
    this.rgbApi.getScenes().pipe(catchError(err => {
      this.toastr.error("Failed to fetch scenes. Try reloading the page");
      throw err;
    })).subscribe(scenes => {
      this.scenes = scenes;
    });
  }

  ngOnInit(): void {
    this.loadEffects();
    this.title.setTitle("RGB Light management - Protogen");
  }
}
