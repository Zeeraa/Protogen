import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-logs-page',
  templateUrl: './logs-page.component.html',
  styleUrl: './logs-page.component.scss',
  standalone: false
})
export class LogsPageComponent implements OnInit {

  constructor(
    private title: Title,
  ) { }

  ngOnInit(): void {
    this.title.setTitle("Logs - Protogen");
  }
}
