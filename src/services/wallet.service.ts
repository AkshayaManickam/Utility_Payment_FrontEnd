import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private apiUrl = 'http://localhost:9090/api/users'; // Backend API endpoint

  constructor(private http: HttpClient) {}

  getWalletBalance(userEmail: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/wallet?email=${userEmail}`);
  }
}
