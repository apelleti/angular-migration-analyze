import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #content class="content">
      <h1>{{ title }}</h1>
      <div *ngIf="data" class="data-section">
        <h2>Data Section</h2>
        <pre>{{ data | json }}</pre>
      </div>
      <div class="items-section">
        <h2>Items List</h2>
        <ul>
          <li *ngFor="let item of items">{{ item }}</li>
        </ul>
      </div>
      <div class="actions">
        <button (click)="loadData()" class="btn btn-primary">Load Data</button>
        <button (click)="highlightElement()" class="btn btn-secondary">Highlight</button>
      </div>
    </div>
    <div #sidebar class="sidebar">
      <h3>Sidebar</h3>
      <p>Additional content</p>
    </div>
  `,
  styles: [`
    .content {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .content.highlighted {
      background-color: #fff3cd;
      border: 2px solid #ffc107;
    }
    .sidebar {
      background-color: #e9ecef;
      padding: 15px;
      border-radius: 8px;
    }
    .btn {
      padding: 10px 15px;
      margin-right: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-primary { background-color: #007bff; color: white; }
    .btn-secondary { background-color: #6c757d; color: white; }
  `]
})
export class AppComponent implements OnInit {
  title = 'Angular Migration Test Project';
  data: any = null;
  items = ['Item 1', 'Item 2', 'Item 3'];
  
  @ViewChild('content', { static: false }) content!: ElementRef;
  @ViewChild('sidebar', { static: false }) sidebar!: ElementRef;
  
  constructor(private http: HttpClient) {}
  
  ngOnInit() {
    this.loadData();
  }
  
  loadData(): void {
    this.http.get<any>('/api/data').pipe(
      map(res => res as any),
      catchError(err => {
        console.error('Error loading data:', err);
        return of({ message: 'Sample data', timestamp: new Date() });
      })
    ).subscribe(data => {
      this.data = data;
    });
  }
  
  highlightElement() {
    if (this.content?.nativeElement) {
      this.content.nativeElement.classList.add('highlighted');
    }
  }
}
