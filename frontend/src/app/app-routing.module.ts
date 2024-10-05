import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard-page/dashboard-page.component';
import { VisorPageComponent } from './features/visor/pages/visor-page/visor-page.component';
import { VideoPlayerPageComponent } from './features/video-player/pages/video-player-page/video-player-page.component';
import { SystemPageComponent } from './features/system/pages/system-page/system-page.component';

export const routes: Routes = [
  {
    path: "",
    component: DashboardPageComponent
  },
  {
    path: "visor",
    component: VisorPageComponent
  },
  {
    path: "video-player",
    component: VideoPlayerPageComponent
  },
  {
    path: "system",
    component: SystemPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
