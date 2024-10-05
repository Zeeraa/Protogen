import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { SystemApiService, SystemOverview } from '../../../../core/services/api/system-api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-system-page',
  templateUrl: './system-page.component.html',
  styleUrl: './system-page.component.scss'
})
export class SystemPageComponent implements OnInit, OnDestroy {
  @ViewChild("shutdownModal") shutdownModalTemplate!: TemplateRef<any>;
  overview: SystemOverview | null = null;
  updateInterval: any = null;
  shutdownModalRef: null | NgbModalRef = null;

  get cpuUsage() {
    if (this.overview?.cpuUsage !== undefined) {
      return this.overview.cpuUsage;
    }
    return 0;
  }

  get ramUsage() {
    if (this.overview?.ramUsage !== undefined) {
      return this.overview.ramUsage;
    }
    return 0;
  }

  get getTemperature() {
    if (this.overview?.cpuTemperature !== undefined) {
      return this.overview.cpuTemperature;
    }
    return 0;
  }

  get osName() {
    return this.overview?.osVersion || "Unknown";
  }

  openShutdownModal() {
    this.shutdownModalRef?.close();
    this.shutdownModalRef = this.modal.open(this.shutdownModalTemplate, { ariaLabelledBy: 'shutdown-modal-title' });
  }

  update() {
    this.api.getOverview().pipe(catchError(err => {
      this.toastr.error("Failed to get system overview");
      throw err;
    })).subscribe(overview => {
      this.overview = overview;
    });
  }

  shutdown() {
    this.shutdownModalRef?.close();
    this.toastr.info("Executing poweroff command...");
    this.api.shutdown().pipe(catchError(err => {
      console.error(err);
      this.toastr.error("Failed to run command");
      throw err;
    })).subscribe(() => {
      this.toastr.success("Shutdown command executed!");
    });
  }

  constructor(
    private toastr: ToastrService,
    private api: SystemApiService,
    private modal: NgbModal,
  ) { }

  ngOnInit(): void {
    this.update();
    this.updateInterval = setInterval(() => {
      this.update();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.updateInterval != null) {
      clearInterval(this.updateInterval);
    }
  }
}
