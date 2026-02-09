import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Pipeline As A Product';
  isHealthy = false;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.checkHealth();
  }

  checkHealth() {
    this.apiService.checkHealth().subscribe({
      next: (response) => {
        this.isHealthy = response.ok;
      },
      error: (error) => {
        console.error('Backend is not available', error);
        this.isHealthy = false;
      }
    });
  }
}
