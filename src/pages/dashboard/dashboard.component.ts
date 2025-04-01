import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InvoiceService } from '../../services/invoice.service';
import { Bill } from '../../models/Bill'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,FormsModule],
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
  


  downloadParticularInvoice(invoice: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add header image (adjust path as necessary)
    const headerImg = 'assets/header.png';
    doc.addImage(headerImg, 'PNG', 10, 5, pageWidth - 20, 15);

    // Title and meta information
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 100);
    doc.text('INVOICE', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice ID: ${invoice.id}`, 14, 45);
    doc.text(`Bill Date: ${new Date(invoice.billGeneratedDate).toLocaleDateString()}`, 14, 55);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 14, 65);

    // Draw a line after the header
    doc.setDrawColor(0);
    doc.line(14, 70, pageWidth - 14, 70);

    // Customer details section
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);  // Blue color
    doc.text('Customer Details', 14, 80);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);  // Black color
    doc.text(`Service Connection No: ${invoice.serviceConnectionNumber}`, 14, 90);

    // Draw a line after customer details
    doc.setDrawColor(0);
    doc.line(14, 100, pageWidth - 14, 100);

    // Table for invoice details
    const tableColumn = ["Item", "Details"];
    const tableRows = [
      ["Units Consumed", invoice.unitsConsumed],
      ["Total Amount", invoice.totalAmount],
      ["Payment Status", invoice.isPaid ]
    ];

    autoTable(doc, {
      startY: 105, 
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 102, 204], 
        textColor: [255, 255, 255], 
        fontSize: 12,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 12,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      margin: { top: 10, left: 14, right: 14 },
    });

    // Footer image (adjust path as necessary)
    const footerImg = 'assets/footer.png';
    doc.addImage(footerImg, 'PNG', 10, pageHeight - 30, pageWidth - 20, 20);

    // Save the document as a PDF file with invoice ID as the name
    doc.save(`Invoice_${invoice.id}.pdf`);
  }

    isPaymentModalVisible: boolean = false;   // To toggle modal visibility
    // Selected bill for payment
    selectedBill: Bill | undefined;
    selectedPaymentMethod: string = 'creditCard'; // Default payment method
    creditCardNumber: string = '';
    debitCardNumber: string = '';
    cardNumber: string = ''; 
    expiryDate: string = ''; 
    cvv: string = ''; 
    walletId: string = '';
    discount: number = 0;  // Discount amount
    lateFee: number = 0;  // Late fee amount
    payAmount: number = 0;  // Final amount to pay

    // Open the payment modal
    openPaymentModal(bill: Bill) {
      console.log("Opening payment modal for bill:", bill);
      this.selectedBill = bill;
      this.isPaymentModalVisible = true;
      if (this.isBeforeDueDate(bill)) {
        this.discount = bill.totalAmount * 0.10; 
        this.lateFee = 0;
      } else {
        this.lateFee = bill.totalAmount * 0.05; 
        this.discount = 0;
      }
      this.payAmount = bill.totalAmount - this.discount + this.lateFee;
    }

    // Close the payment modal
    closePaymentModal() {
      this.isPaymentModalVisible = false;
    }

    // Check if the bill is before the due date
    isBeforeDueDate(bill: Bill): boolean {
      const dueDate = new Date(bill.dueDate);
      const currentDate = new Date();
      return currentDate <= dueDate;
    }

    // Handle payment method change
    onPaymentMethodChange() {
      // You can add further logic to handle changes in payment method
      console.log('Selected payment method:', this.selectedPaymentMethod);
    }

    // Handle bill payment
    payBill() {
      // Here, you can make an API call to process the payment
      console.log('Payment processed with', this.selectedPaymentMethod);

      // Example of calling a service to process the payment
      // this.paymentService.processPayment(this.selectedBill, this.selectedPaymentMethod, this.payAmount)
      //     .subscribe(response => {
      //       // Handle success or failure
      //     });

      // Close the modal after payment
      this.closePaymentModal();
    }

}
