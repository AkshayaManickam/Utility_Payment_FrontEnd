import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiscountService {
  
  private apiUrl = 'http://localhost:9090/api/payment';

  constructor(private http: HttpClient) { }

  getDiscountedAmount(invoiceId: number, discountType: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/calculate`, {
      params: { invoiceId, discountType }
    });
  }
}
