import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard-page/dashboard-page.component';
import { VisorPageComponent } from './features/visor/pages/visor-page/visor-page.component';
import { VideoPlayerPageComponent } from './features/video-player/pages/video-player-page/video-player-page.component';
import { SystemPageComponent } from './features/system/pages/system-page/system-page.component';
import { RgbDashboardPageComponent } from './features/rgb/pages/rgb-dashboard-page/rgb-dashboard-page.component';
import { RgbEditorPageComponent } from './features/rgb/pages/rgb-editor-page/rgb-editor-page.component';
import { LogsPageComponent } from './features/logs/pages/logs-page/logs-page.component';
import { VisorImageFaceEditorComponent } from './features/visor/pages/visor-image-face-editor/visor-image-face-editor.component';
import { UserManagerPageComponent } from './features/user-manager/pages/user-manager-page/user-manager-page.component';

export const routes: Routes = [
  {
    path: "",
    component: DashboardPageComponent,
  },
  {
    path: "visor",
    component: VisorPageComponent,
  },
  {
    path: "visor/image/:id",
    component: VisorImageFaceEditorComponent,
  },
  {
    path: "video-player",
    component: VideoPlayerPageComponent,
  },
  {
    path: "system",
    component: SystemPageComponent,
  },
  {
    path: "rgb",
    component: RgbDashboardPageComponent,
  },
  {
    path: "rgb/editor/:id",
    component: RgbEditorPageComponent,
  },
  {
    path: "logs",
    component: LogsPageComponent,
  },
  {
    path: "users",
    component: UserManagerPageComponent,
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
