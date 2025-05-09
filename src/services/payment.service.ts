import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../models/Payment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'http://localhost:9090/api/payments';

  constructor(private http: HttpClient) {}

  makePayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pay`, paymentData);
  }

  getAllPayments(userEmail: string): Observable<Transaction[]> {
    let params = new HttpParams().set('email', userEmail);
    return this.http.get<Transaction[]>(`${this.apiUrl}/user`, { params });
  }

  getWalletTransactions(userEmail: string): Observable<any> {
    let params = new HttpParams().set('email', userEmail);
    return this.http.get(`${this.apiUrl}/wallet-transactions`, { params });
  }
}
