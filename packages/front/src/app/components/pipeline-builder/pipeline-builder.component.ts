import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Step, StepConfig } from '../../services/api.service';
import { PipelineStateService } from '../../services/pipeline-state.service';

@Component({
  selector: 'app-pipeline-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pipeline-builder.component.html',
  styleUrls: ['./pipeline-builder.component.scss']
})
export class PipelineBuilderComponent implements OnInit {
  availableSteps: Step[] = [];
  selectedProvider: 'github' | 'gitlab' | null = null;
  selectedStepId: string = '';
  selectedVersion: string = '';
  availableVersions: string[] = [];
  
  pipelineSteps: StepConfig[] = [];
  
  isLoadingSteps = false;
  isLoadingVersions = false;
  isRendering = false;
  isExporting = false;
  
  renderedPipeline: string = '';
  showPreview = false;
  
  // Export settings
  showExportModal = false;
  exportToken = '';
  exportOwner = '';
  exportRepo = '';
  exportProjectId = '';
  exportBranch = 'ci/generated-pipeline';
  exportBaseBranch = 'main';
  exportMessage = 'Add generated CI pipeline';
  exportCreatePR = true;
  
  error: string | null = null;
  success: string | null = null;

  constructor(
    private apiService: ApiService,
    private pipelineState: PipelineStateService
  ) {}

  ngOnInit() {
    this.loadSteps();
    this.pipelineState.state$.subscribe(state => {
      this.selectedProvider = state.provider;
      this.pipelineSteps = state.steps;
    });
  }

  loadSteps() {
    this.isLoadingSteps = true;
    this.error = null;
    
    this.apiService.getSteps().subscribe({
      next: (response) => {
        this.availableSteps = response.items;
        this.isLoadingSteps = false;
      },
      error: (error) => {
        this.error = 'Failed to load steps: ' + error.message;
        this.isLoadingSteps = false;
      }
    });
  }

  onProviderChange(provider: 'github' | 'gitlab') {
    this.pipelineState.setProvider(provider);
    this.selectedProvider = provider;
  }

  onStepSelect(stepId: string) {
    this.selectedStepId = stepId;
    this.loadVersions(stepId);
  }

  loadVersions(stepId: string) {
    this.isLoadingVersions = true;
    
    this.apiService.getStepVersions(stepId).subscribe({
      next: (response) => {
        this.availableVersions = response.versions;
        if (this.availableVersions.length > 0) {
          this.selectedVersion = this.availableVersions[0];
        }
        this.isLoadingVersions = false;
      },
      error: (error) => {
        this.error = 'Failed to load versions: ' + error.message;
        this.isLoadingVersions = false;
      }
    });
  }

  addStepToPipeline() {
    if (!this.selectedStepId || !this.selectedVersion) {
      this.error = 'Please select a step and version';
      return;
    }

    const stepConfig: StepConfig = {
      id: this.selectedStepId,
      version: this.selectedVersion,
      config: {}
    };

    this.pipelineState.addStep(stepConfig);
    this.success = 'Step added to pipeline';
    setTimeout(() => this.success = null, 3000);
  }

  removeStep(index: number) {
    this.pipelineState.removeStep(index);
  }

  moveStepUp(index: number) {
    if (index > 0) {
      this.pipelineState.moveStep(index, index - 1);
    }
  }

  moveStepDown(index: number) {
    if (index < this.pipelineSteps.length - 1) {
      this.pipelineState.moveStep(index, index + 1);
    }
  }

  renderPipeline() {
    if (!this.selectedProvider) {
      this.error = 'Please select a provider';
      return;
    }

    if (this.pipelineSteps.length === 0) {
      this.error = 'Please add at least one step';
      return;
    }

    this.isRendering = true;
    this.error = null;

    const request = {
      provider: this.selectedProvider,
      steps: this.pipelineSteps
    };

    this.apiService.renderPipeline(request).subscribe({
      next: (response) => {
        this.renderedPipeline = response.rendered;
        this.showPreview = true;
        this.isRendering = false;
        this.success = 'Pipeline rendered successfully!';
        setTimeout(() => this.success = null, 3000);
      },
      error: (error) => {
        this.error = 'Failed to render pipeline: ' + error.error?.error || error.message;
        this.isRendering = false;
      }
    });
  }

  openExportModal() {
    if (!this.renderedPipeline) {
      this.error = 'Please render the pipeline first';
      return;
    }
    this.showExportModal = true;
  }

  closeExportModal() {
    this.showExportModal = false;
  }

  exportPipeline() {
    if (!this.selectedProvider) {
      this.error = 'Please select a provider';
      return;
    }

    if (!this.exportToken) {
      this.error = 'Please provide an access token';
      return;
    }

    this.isExporting = true;
    this.error = null;

    const exportRequest: any = {
      provider: this.selectedProvider,
      auth: {
        token: this.exportToken
      },
      repo: {},
      options: {
        branch: this.exportBranch,
        baseBranch: this.exportBaseBranch,
        message: this.exportMessage,
        createPR: this.exportCreatePR
      },
      pipelineSpec: {
        provider: this.selectedProvider,
        steps: this.pipelineSteps
      }
    };

    if (this.selectedProvider === 'github') {
      exportRequest.repo.owner = this.exportOwner;
      exportRequest.repo.name = this.exportRepo;
    } else {
      exportRequest.repo.projectId = this.exportProjectId;
    }

    this.apiService.exportPipeline(exportRequest).subscribe({
      next: (response) => {
        this.success = 'Pipeline exported successfully!';
        this.isExporting = false;
        this.closeExportModal();
        console.log('Export response:', response);
        setTimeout(() => this.success = null, 5000);
      },
      error: (error) => {
        this.error = 'Failed to export pipeline: ' + (error.error?.error || error.message);
        this.isExporting = false;
      }
    });
  }

  downloadPipeline() {
    if (!this.renderedPipeline) {
      return;
    }

    const filename = this.selectedProvider === 'gitlab' 
      ? '.gitlab-ci.yml' 
      : 'ci.yml';
    
    const blob = new Blob([this.renderedPipeline], { type: 'text/yaml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  resetPipeline() {
    if (confirm('Are you sure you want to reset the pipeline?')) {
      this.pipelineState.reset();
      this.renderedPipeline = '';
      this.showPreview = false;
      this.success = 'Pipeline reset successfully';
      setTimeout(() => this.success = null, 3000);
    }
  }
}
