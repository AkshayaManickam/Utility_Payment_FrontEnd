import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InvoiceService } from '../../services/invoice.service';
import { Bill } from '../../models/Bill'; 


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  activeTab: string = 'home'; 
  homeData = { users: 0, bills: 0 };

  showHome() {
    this.activeTab = 'home';
  }

  logout() {
    console.log('User logged out');
    // Handle logout logic here
  }

  pendingBills: Bill[] = [];  // Initialize as empty array
  userEmail: string | null = null;

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    // Fetch user email from local storage
    this.userEmail = localStorage.getItem('userEmail');
    if (this.userEmail) {
      console.log('User Email:', this.userEmail);
      this.loadPendingBills();
    } else {
      console.warn('User email is not available, cannot load bills.');
    }
  }

  loadPendingBills(): void {
    if (this.userEmail) {
      this.invoiceService.getPendingBills(this.userEmail).subscribe({
        next: (bills: any[]) => {  // 'any' if response structure is unknown
          console.log('Bills fetched:', bills);
          // Map the response to the expected Bill structure
          this.pendingBills = bills.map(bill => ({
            id: bill.id,
            serviceConnectionNumber: bill.serviceConnectionNumber,
            unitsConsumed: bill.unitsConsumed,
            totalAmount: bill.totalAmount,
            billGeneratedDate: bill.billGeneratedDate,
            dueDate: bill.dueDate,
            isPaid: bill.isPaid
          }));
        },
        error: (err) => {
          console.error('Error fetching bills', err);
          this.pendingBills = [];  // Reset to empty array on error
        }
      });
    } else {
      console.warn('User email not found, unable to load bills.');
      this.pendingBills = [];  // Reset to empty array if email is not available
    }
  }
  
  

  payBill(billId: number): void {
    this.invoiceService.payBill(billId).subscribe({
      next: () => {
        alert(`Payment successful for Invoice ID: ${billId}`);
        this.loadPendingBills();  // Refresh the list of pending bills
      },
      error: (err) => {
        console.error('Error processing payment', err);
        alert('Payment failed. Please try again later.');
      }
    });
  }

  downloadBill(billId: number): void {
    alert(`Downloading bill for Invoice ID: ${billId}`);
    // Implement your download logic here
  }
}
