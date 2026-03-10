import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-remote-page',
  templateUrl: './remote-page.component.html',
  styleUrl: './remote-page.component.scss',
  standalone: false
})
export class RemotePageComponent implements OnInit {
  private readonly title = inject(Title);

  ngOnInit(): void {
    this.title.setTitle("Remote - Protogen");
  }
}
