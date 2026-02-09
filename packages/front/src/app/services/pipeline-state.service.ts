import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StepConfig } from './api.service';

export interface PipelineState {
  provider: 'github' | 'gitlab' | null;
  steps: StepConfig[];
  pipelineConfig?: any;
  workflowConfig?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PipelineStateService {
  private stateSubject = new BehaviorSubject<PipelineState>({
    provider: null,
    steps: []
  });

  public state$: Observable<PipelineState> = this.stateSubject.asObservable();

  constructor() {}

  get currentState(): PipelineState {
    return this.stateSubject.value;
  }

  setProvider(provider: 'github' | 'gitlab'): void {
    this.stateSubject.next({
      ...this.currentState,
      provider
    });
  }

  addStep(step: StepConfig): void {
    const currentSteps = [...this.currentState.steps];
    currentSteps.push(step);
    this.stateSubject.next({
      ...this.currentState,
      steps: currentSteps
    });
  }

  removeStep(index: number): void {
    const currentSteps = [...this.currentState.steps];
    currentSteps.splice(index, 1);
    this.stateSubject.next({
      ...this.currentState,
      steps: currentSteps
    });
  }

  updateStep(index: number, step: StepConfig): void {
    const currentSteps = [...this.currentState.steps];
    currentSteps[index] = step;
    this.stateSubject.next({
      ...this.currentState,
      steps: currentSteps
    });
  }

  moveStep(fromIndex: number, toIndex: number): void {
    const currentSteps = [...this.currentState.steps];
    const [movedStep] = currentSteps.splice(fromIndex, 1);
    currentSteps.splice(toIndex, 0, movedStep);
    this.stateSubject.next({
      ...this.currentState,
      steps: currentSteps
    });
  }

  setPipelineConfig(config: any): void {
    this.stateSubject.next({
      ...this.currentState,
      pipelineConfig: config
    });
  }

  setWorkflowConfig(config: any): void {
    this.stateSubject.next({
      ...this.currentState,
      workflowConfig: config
    });
  }

  reset(): void {
    this.stateSubject.next({
      provider: null,
      steps: []
    });
  }
}
