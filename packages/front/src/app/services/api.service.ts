import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Step {
  id: string;
  name: string;
  description?: string;
}

export interface StepVersion {
  version: string;
  manifest: {
    providers: string[];
    [key: string]: any;
  };
}

export interface StepConfig {
  id: string;
  version: string;
  config?: any;
}

export interface PipelineRequest {
  provider: 'github' | 'gitlab';
  steps: StepConfig[];
  pipeline?: any;
  workflow?: any;
}

export interface ExportRequest {
  provider: 'github' | 'gitlab';
  auth: {
    token: string;
    baseUrl?: string;
  };
  repo: {
    owner?: string;
    name?: string;
    projectId?: string;
  };
  options?: {
    baseBranch?: string;
    branch?: string;
    message?: string;
    createPR?: boolean;
  };
  pipelineSpec: PipelineRequest;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Health check
  checkHealth(): Observable<{ ok: boolean }> {
    return this.http.get<{ ok: boolean }>(`${this.apiUrl}/health`);
  }

  // Get all steps
  getSteps(): Observable<{ stepsRoot: string; items: Step[] }> {
    return this.http.get<{ stepsRoot: string; items: Step[] }>(`${this.apiUrl}/steps`);
  }

  // Get versions of a step
  getStepVersions(id: string): Observable<{ id: string; versions: string[] }> {
    return this.http.get<{ id: string; versions: string[] }>(`${this.apiUrl}/steps/${id}/versions`);
  }

  // Get specific step version details
  getStepVersion(id: string, version: string): Observable<StepVersion> {
    return this.http.get<StepVersion>(`${this.apiUrl}/steps/${id}/${version}`);
  }

  // Render a single step
  renderStep(id: string, version: string, provider: string, config?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/steps/${id}/${version}/render`, {
      provider,
      config
    });
  }

  // Render complete pipeline
  renderPipeline(request: PipelineRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/pipeline/render`, request);
  }

  // Export pipeline to GitHub/GitLab
  exportPipeline(request: ExportRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/pipeline/export`, request);
  }
}
