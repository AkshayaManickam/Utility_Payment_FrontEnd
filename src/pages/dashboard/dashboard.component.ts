import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InvoiceService } from '../../services/invoice.service';
import { Bill } from '../../models/Bill'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { DiscountService } from '../../services/discount.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { Payment } from '../../models/Payment';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  @Input() activeTab: string = 'home';
  homeData = { users: 0, bills: 0 };

  showHome() {
    this.activeTab = 'home';
  }

  logout() {
    console.log('User logged out');
  }

  pendingBills: Bill[] = [];  
  userEmail: string | null = null;

  constructor(private invoiceService: InvoiceService,private paymentService:PaymentService,private discountService: DiscountService,private toastr: ToastrService,private walletService: WalletService) {}

  ngOnInit(): void {
    this.userEmail = localStorage.getItem('userEmail');
    if (this.userEmail) {
      console.log('User Email:', this.userEmail);
      this.loadPendingBills();
    } else {
      console.warn('User email is not available, cannot load bills.');
    } 
    this.loadPayments();
    this.fetchWalletBalance();
    this.fetchRecentTransactions();
  }

  loadPendingBills(): void {
    if (this.userEmail) {
      this.invoiceService.getPendingBills(this.userEmail).subscribe({
        next: (bills: any[]) => { 
          console.log('Bills fetched:', bills);
          this.pendingBills = bills.map(bill => ({
            id: bill.id,
            serviceConnectionNumber: bill.serviceConnectionNumber,
            unitsConsumed: bill.unitsConsumed,
            totalAmount: bill.totalAmount,
            billGeneratedDate: bill.billGeneratedDate,
            dueDate: bill.dueDate,
            isPaid: bill.isPaid
          }));
          this.applyFilters();
        },
        error: (err) => {
          console.error('Error fetching bills', err);
          this.pendingBills = []; 
        }
      });
    } else {
      console.warn('User email not found, unable to load bills.');
      this.pendingBills = [];  
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

    isPaymentModalVisible: boolean = false;  
    @Input() selectedBill: Bill | undefined;
    selectedPaymentMethod: string = 'creditCard'; 
    creditCardNumber: string = '';
    debitCardNumber: string = '';
    cardNumber: string = ''; 
    expiryDate: string = ''; 
    cvv: string = ''; 
    walletId: string = '';
    discount: number = 0;  
    lateFee: number = 0;  
    payAmount: number = 0;
    isBeforeDueDate = false;
    isAfterDueDate = false;

    openPaymentModal(bill: Bill) {
      console.log("Opening payment modal for bill:", bill);
      this.selectedBill = bill;
      this.isPaymentModalVisible = true;
      this.checkDueDateAndFetchDiscount(); 
    }
    closePaymentModal() {
      this.isPaymentModalVisible = false;
    }

    onPaymentMethodChange() {
      console.log('Selected payment method:', this.selectedPaymentMethod);
    }

    payBill() {

      const discountType = this.isBeforeDueDate ? "beforeDueDate" : this.isAfterDueDate ? "afterDueDate" : "None";  

      const paymentData = {
        invoiceId: this.selectedBill?.id,
        amount: this.payAmount,  
        paymentMethod: this.selectedPaymentMethod,
        discountType: discountType
      };
      console.log("Sending Payment Data:", paymentData);
      this.paymentService.makePayment(paymentData)
        .subscribe({
          next: (response) => {
            console.log("Payment Success Response:", response);
            this.resetFormBill();
            this.toastr.success(response.message, 'Success'); 
            this.loadPendingBills();
            this.fetchRecentTransactions();
            this.closePaymentModal();
          },
          error: (error) => {
            console.error("Payment Error:", error);
            const errorMessage = error?.error?.message || "Unknown error";
            this.toastr.error(errorMessage, 'Error'); 
            console.log(errorMessage);
            this.resetFormBill();
            this.loadPendingBills();
            this.closePaymentModal();
          }
        });
    }

    resetFormBill() {
      this.selectedBill = undefined;
      this.payAmount = 0;
      this.selectedPaymentMethod = '';
      this.cardNumber = '';
      this.expiryDate = '';
      this.cvv = '';
    }

    generateCrashCard() {
      const crashCardOffers = [
          { offer: "₹50 Cashback on Next Payment", discount: 50, validity: "7 Days" },
          { offer: "10% Off on Next Recharge", discount: 10, validity: "5 Days" },
          { offer: "Free ₹100 Shopping Voucher", discount: 100, validity: "7 Days" },
          { offer: "1-Month Free Subscription", discount: 0, validity: "30 Days" }
      ];
  
      return crashCardOffers[Math.floor(Math.random() * crashCardOffers.length)];
    }

    closeSuccessModal() {
      this.showSuccessModal = false;
    }

    showSuccessModal: boolean = false;
    
    checkDueDateAndFetchDiscount() {
      console.log('Checking due date and fetching discount for bill:', this.selectedBill);    
      if (!this.selectedBill || !this.selectedBill.dueDate) {
        console.warn('No selected bill or due date found!');
        return;
      }
      const dueDate = new Date(this.selectedBill.dueDate); // Convert dueDate to Date object
      const today = new Date();
      console.log(today);
      if (today <= dueDate) {
        this.isBeforeDueDate = true;
        this.isAfterDueDate = false;
        this.discountService.getDiscountedAmount(this.selectedBill?.id ?? 0, 'beforeDueDateAndOnline')
        .subscribe(
          (response) => {
            this.payAmount= response; 
            this.lateFee = 0; 
            this.discount = (this.selectedBill?.totalAmount ?? 0) - this.payAmount; 
          },
          (error) => {
            console.error('Error fetching discount:', error);
            this.discount = 0;
          }
        );
    
      } else {
        this.isBeforeDueDate = false;
        this.isAfterDueDate = true;
    
        this.discountService.getDiscountedAmount(this.selectedBill?.id ?? 0, 'afterDueDate')
        .subscribe(
          (response) => {
            this.payAmount = response; 
            this.discount = 0; 
            this.lateFee = (this.selectedBill?.totalAmount ?? 0) + this.payAmount;
          },
          (error) => {
            console.error('Error fetching discount:', error);
            this.discount = 0;
          }
        );
      }
    }

    payments: Payment[] = [];
    searchQuery: string = '';
    currentPage: number = 0;
    itemsPerPage: number = 5;
    totalPages: number = 0;

    loadPayments(): void {
      if (this.userEmail) {
        this.paymentService.getAllPayments(this.userEmail).subscribe(data => {
          console.log(data);
          this.payments = data;
          this.totalPages = Math.ceil(this.payments.length / this.itemsPerPage);
        });
      }
    }
  
    getFilteredPayments(): Payment[] {
      let filteredPayments = this.payments.filter(payment =>
        payment.id?.toString().includes(this.searchQuery) ||
        (payment.invoice?.id ? payment.invoice.id.toString().includes(this.searchQuery) : false) ||
        payment.paymentMethod.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    
      return filteredPayments.slice(this.currentPage * this.itemsPerPage, (this.currentPage + 1) * this.itemsPerPage);
    }
    
  
    changePage(newPage: number): void {
      if (newPage >= 0 && newPage < this.totalPages) {
        this.currentPage = newPage;
      }
    }
    
    walletBalance: number = 0;
    rewardPoints = 25;

    fetchWalletBalance() {
      if(this.userEmail){
        this.walletService.getWalletBalance(this.userEmail).subscribe(
            balance => {
              console.log(balance);
                this.walletBalance = balance;
            },
            error => {
                console.error('Error fetching wallet balance', error);
            }
        );
      }
  }

  
  filteredBills: any[] = [];
  statusFilter: string = 'Not Paid';
  dateFilter: string = 'ALL';

  applyFilters() {
    const today = new Date();
    let filtered = [...this.pendingBills];
    if (this.statusFilter === 'PAID') {
      filtered = filtered.filter(bill => bill.isPaid === 'PAID');
    } else if (this.statusFilter === 'Not Paid') {
      filtered = filtered.filter(bill => bill.isPaid !== 'PAID');
    }
    if (this.dateFilter === '3M') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      filtered = filtered.filter(bill => new Date(bill.billGeneratedDate) >= threeMonthsAgo);
    } else if (this.dateFilter === '6M') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      filtered = filtered.filter(bill => new Date(bill.billGeneratedDate) >= sixMonthsAgo);
    }
    this.filteredBills = filtered;
  }

  transactions: any[] = [];

  fetchRecentTransactions() {
    if(this.userEmail){
      this.paymentService.getWalletTransactions(this.userEmail).subscribe(
        (data) => {
          console.log('wallet');
          console.log(data);
          this.transactions = data.map((payment: Payment) => ({
            description: `Payment via ${payment.paymentMethod}`,
            amount: payment.amount,
            date: new Date(payment.paymentDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
          }) 
          }));
        },
        (error) => {
          console.error('Error fetching transactions:', error);
        }
      );
    }
  }

  sparkles: any[] = [];

  createSparkles() {
    this.sparkles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      top: Math.random() * 50 + 'px',
      animationDelay: Math.random() * 0.5 + 's'
    }));
  }
 
}
