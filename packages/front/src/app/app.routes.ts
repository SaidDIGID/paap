import { Routes } from '@angular/router';
import { PipelineBuilderComponent } from './components/pipeline-builder/pipeline-builder.component';

export const routes: Routes = [
  {
    path: '',
    component: PipelineBuilderComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
