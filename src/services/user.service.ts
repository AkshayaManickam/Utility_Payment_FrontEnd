import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:9090/api/users'; 

  constructor(private http: HttpClient) {}

  getTotalConsumption(userEmail: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${userEmail}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching consumption data:', error);
          return throwError(() => new Error('Failed to fetch consumption data.'));
        })
      );
  }

  addMoneyToWallet(email: string, amount: number) {
    const params = new HttpParams()
      .set('email', email)
      .set('amount', amount);

    return this.http.post(`${this.apiUrl}/add-money`, {}, { params, responseType: 'text' });
  }
}
