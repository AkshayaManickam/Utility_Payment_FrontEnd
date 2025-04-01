import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Bill {
  id: number;
  serviceNo: string;
  unitsConsumed: number;
  amount: number;
  billDate: string;
  dueDate: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'http://localhost:9090/api/invoices';

  constructor(private http: HttpClient) {}

  getPendingBills(userEmail: string) {
    const headers = new HttpHeaders().set('Accept', 'application/json');
    const encodedEmail = encodeURIComponent(userEmail);  // URL encode the email
    return this.http.get<Bill[]>(`http://localhost:9090/api/invoices/pending/${encodedEmail}`, { headers });
  }
  
  payBill(billId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/pay/${billId}`, {});
  }
}
