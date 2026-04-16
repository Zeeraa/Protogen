import { Injectable } from '@angular/core';
import { ApiBaseService } from '../api-base.service';
import { ActionType } from '../../enum/ActionType';

@Injectable({
  providedIn: 'root'
})
export class ActionApiService extends ApiBaseService {
  getActionSets() {
    return this.http.get<ActionSet[]>(this.apiBaseUrl + "/actions");
  }

  createActionSet(name: string, showOnDashboard: boolean) {
    return this.http.post<ActionSet>(this.apiBaseUrl + "/actions", { name, showOnDashboard, actions: [] });
  }

  editActionSet(id: number, data: AlterActionSet) {
    return this.http.put<ActionSet>(this.apiBaseUrl + "/actions/" + id, data);
  }

  deleteActionSet(id: number) {
    return this.http.delete(this.apiBaseUrl + "/actions/" + id);
  }

  activateActionSet(id: number) {
    return this.http.post(this.apiBaseUrl + "/actions/" + id + "/run", {});
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
