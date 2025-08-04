import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataSubject = new BehaviorSubject<any>(null);
  
  constructor(private http: HttpClient) {}
  
  fetchData(): Observable<any> {
    return this.http.get<any>('/api/data').pipe(
      map(response => response),
      shareReplay(1)
    );
  }
  
  getData(): Observable<any> {
    return this.dataSubject.asObservable();
  }
  
  updateData(data: any): void {
    this.dataSubject.next(data);
  }
}
