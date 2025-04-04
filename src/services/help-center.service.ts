import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HelpCenterService {
  private apiUrl = 'http://localhost:9090/api/help'; // Backend URL

  constructor(private http: HttpClient) {}

  sendHelpRequest(helpData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, helpData);
  }

  getUserHelpRequests(userMail: string): Observable<any[]> {
    const encodedEmail = encodeURIComponent(userMail); // Encode the email
    return this.http.get<any[]>(`${this.apiUrl}/user/${encodedEmail}`);
  }
}

