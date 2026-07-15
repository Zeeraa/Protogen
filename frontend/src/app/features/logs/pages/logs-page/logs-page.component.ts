import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-logs-page',
  templateUrl: './logs-page.component.html',
  styleUrl: './logs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class LogsPageComponent implements OnInit {
  private readonly title = inject(Title);

  ngOnInit(): void {
    this.title.setTitle("Logs - Protogen");
  }
}
