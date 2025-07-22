import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { catchError } from 'rxjs';
import { ActionType } from '../../enum/ActionType';

@Injectable({
  providedIn: 'root'
})
export class ActionApiService extends ApiBaseService {
  getActionSets() {
    return this.http.get<ActionSet[]>(this.apiBaseUrl + "/actions").pipe(catchError(this.defaultErrorHandler));
  }

  createActionSet(name: string, showOnDashboard: boolean) {
    return this.http.post<ActionSet>(this.apiBaseUrl + "/actions", { name, showOnDashboard, actions: [] }).pipe(catchError(this.defaultErrorHandler));
  }

  editActionSet(id: number, data: AlterActionSet) {
    return this.http.put<ActionSet>(this.apiBaseUrl + "/actions/" + id, data).pipe(catchError(this.defaultErrorHandler));
  }

  deleteActionSet(id: number) {
    return this.http.delete(this.apiBaseUrl + "/actions/" + id).pipe(catchError(this.defaultErrorHandler));
  }

  activateActionSet(id: number) {
    return this.http.post(this.apiBaseUrl + "/actions/" + id + "/run", {}).pipe(catchError(this.defaultErrorHandler));
  }
}

interface AlterActionSet {
  name: string;
  showOnDashboard: boolean;
  actions: Action[];
}

export interface ActionSet {
  id: number;
  name: string;
  showOnDashboard: boolean;
  actions: Action[];
}

export interface Action {
  id?: number;
  virtualId?: number;
  type: ActionType;
  action: string;
  metadata: string | null;
}
