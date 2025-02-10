import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'app-dashboard-page',
    templateUrl: './dashboard-page.component.html',
    styleUrl: './dashboard-page.component.scss',
    standalone: false
})
export class DashboardPageComponent implements OnInit {
  constructor(
    private title: Title,
  ) { }

  ngOnInit(): void {
    this.title.setTitle("Dashboard - Protogen");
  }
}
