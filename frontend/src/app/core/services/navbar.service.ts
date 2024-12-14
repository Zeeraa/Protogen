import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavbarService {
  private _onChangeSubject = new Subject<void>();
  private _element: HTMLElement | null = null;

  public get onChangeObservable() {
    return this._onChangeSubject.asObservable();
  }

  public sizeChanged() {
    this._onChangeSubject.next();
  }

  public setup(element: HTMLElement) {
    this._element = element;
  }

  public get element() {
    return this._element;
  }
}
