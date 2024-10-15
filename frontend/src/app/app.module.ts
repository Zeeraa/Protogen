import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NavbarModule } from './features/navbar/navbar.module';
import { VisorModule } from './features/visor/visor.module';
import { VideoPlayerModule } from './features/video-player/video-player.module';
import { SystemModule } from './features/system/system.module';
import { RgbModule } from './features/rgb/rgb.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    DashboardModule,
    NavbarModule,
    VisorModule,
    VideoPlayerModule,
    SystemModule,
    RgbModule,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }


