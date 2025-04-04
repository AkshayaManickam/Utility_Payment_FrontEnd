import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InvoiceService } from '../../services/invoice.service';
import { Bill } from '../../models/Bill'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { DiscountService } from '../../services/discount.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { Payment } from '../../models/Payment';
import { WalletService } from '../../services/wallet.service';
import { Chart } from 'chart.js/auto';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../../services/user.service';
import { HelpCenterService } from '../../services/help-center.service';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  @Input() activeTab: string = 'home';

  showHome() {
    this.activeTab = 'home';
  }

  logout() {
    const confirmLogout = window.confirm('Are you sure you want to log out?');
    if (confirmLogout) {
      console.log('User logged out');
      localStorage.removeItem('authToken'); 
      sessionStorage.removeItem('authToken'); 
      this.router.navigate(['/login']);
    }
  }

  pendingBills: Bill[] = [];  
  userEmail: string | null = null;
  userForm!: FormGroup;
  helpForm!: FormGroup; 

  constructor(private invoiceService: InvoiceService,private paymentService:PaymentService,private discountService: DiscountService,private toastr: ToastrService,private walletService: WalletService,private router: Router,private userService: UserService,private helpService: HelpCenterService,private fb: FormBuilder) {
    this.userForm = this.fb.group({
      userEmail: new FormControl('')
    });
  }

  ngOnInit(): void {

    this.userForm = this.fb.group({
      userEmail: new FormControl({ value: '', disabled: true })
    });

    this.helpForm = this.fb.group({
      userEmail: new FormControl({ value: '', disabled: true }),  // Read-only email field
      queryType: new FormControl('', Validators.required)  // Dropdown field (required)
    });

    this.userEmail = localStorage.getItem('userEmail');

    this.helpForm = this.fb.group({
      userEmail: new FormControl({ value: this.userEmail || '', disabled: true }),
      queryType: new FormControl(''),
      oldName: new FormControl(''),
      newName: new FormControl(''),
      oldPhone: new FormControl(''),
      newPhone: new FormControl(''),
      oldEmail: new FormControl(''),
      newEmail: new FormControl('')
    });

    if (this.userEmail) {
      this.userForm.patchValue({ userEmail: this.userEmail });
      this.helpForm.patchValue({ userEmail: this.userEmail }); 
      console.log('User Email:', this.userEmail);
      this.loadPendingBills();
    } else {
      console.warn('User email is not available, cannot load bills.');
    } 
    this.loadPayments();
    this.fetchWalletBalance();
    this.getUserConsumption();
    this.loadHelpRequests();
    this.fetchRecentTransactions();
  }

  unitsConsumed: number = 0;
  
  getUserConsumption() {
    if(this.userEmail){
      this.userService.getTotalConsumption(this.userEmail)
        .subscribe(
          (data) => this.unitsConsumed = data,
          (error) => console.error('Error fetching consumption data:', error)
        );
    }
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

  downloadReport(): void {
      const doc = new jsPDF('landscape');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Utility Payment Report', 120, 15);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 120, 22);
      const tableData = this.pendingBills.map((bill, index) => [
          index + 1,
          bill.serviceConnectionNumber,
          bill.unitsConsumed,
          `${bill.totalAmount.toFixed(2)}`,
          new Date(bill.billGeneratedDate).toLocaleDateString(),
          new Date(bill.dueDate).toLocaleDateString(),
          bill.isPaid === 'PAID' ? 'PAID' : 'NOT PAID'
      ]);
      const columns = ['#', 'Connection No.', 'Units', 'Amount', 'Bill Date', 'Due Date', 'Status'];
      autoTable(doc, {
          head: [columns],
          body: tableData,
          startY: 30,
          styles: { fontSize: 10, cellPadding: 6 },
          headStyles: { fillColor: [46, 204, 113], textColor: 255, fontSize: 12 }, 
          bodyStyles: { textColor: 50 },
          alternateRowStyles: { fillColor: [240, 240, 240] }, 
          columnStyles: {
              6: { cellWidth: 30, halign: 'center' } 
          }
      });
      doc.save('Utility_Bills_Report.pdf');
  }

  downloadParticularInvoice(invoice: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const headerImg = 'assets/header.png';
    doc.addImage(headerImg, 'PNG', 10, 5, pageWidth - 20, 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 100);
    doc.text('INVOICE', pageWidth / 2, 35, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice ID: ${invoice.id}`, 14, 45);
    doc.text(`Bill Date: ${new Date(invoice.billGeneratedDate).toLocaleDateString()}`, 14, 55);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 14, 65);
    doc.setDrawColor(0);
    doc.line(14, 70, pageWidth - 14, 70);
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);  
    doc.text('Customer Details', 14, 80);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);  
    doc.text(`Service Connection No: ${invoice.serviceConnectionNumber}`, 14, 90);
    doc.setDrawColor(0);
    doc.line(14, 100, pageWidth - 14, 100);
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
    const footerImg = 'assets/footer.png';
    doc.addImage(footerImg, 'PNG', 10, pageHeight - 30, pageWidth - 20, 20);
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
            this.loadPayments();
            this.fetchWalletBalance();
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
  notPaidBillCount: number = 0; 
  notPaidAmount:number =0;

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
    this.notPaidBillCount = filtered.filter(bill => bill.isPaid !== 'PAID').length;
    this.notPaidAmount = filtered
    .filter(bill => bill.isPaid !== 'PAID')
    .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    console.log(`Number of Not Paid Bills: ${this.notPaidBillCount}`);
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

    submitHelpRequest() {
    if (this.helpForm.valid) {
      const selectedQuery = this.helpForm.value.queryType;
      
      let oldValue = null;
      let newValue = null;

      if (selectedQuery === 'Change Name') {
        oldValue = this.helpForm.value.oldName;
        newValue = this.helpForm.value.newName;
      } else if (selectedQuery === 'Change Phone Number') {
        oldValue = this.helpForm.value.oldPhone;
        newValue = this.helpForm.value.newPhone;
      } else if (selectedQuery === 'Change Email ID') {
        oldValue = this.helpForm.value.oldEmail;
        newValue = this.helpForm.value.newEmail;
      }

      const helpRequest = {
        userMail: this.userEmail,
        query: selectedQuery,
        oldValue: oldValue,
        newValue: newValue,
        status: 'SENT'
      };

      this.helpService.sendHelpRequest(helpRequest).subscribe(response => {
        alert('Help request submitted successfully!');
        this.helpForm.reset();
      }, error => {
        alert('Failed to submit help request.');
      });
    }
  }


  onQueryChange(): void {
    const selectedQuery = this.helpForm.get('queryType')?.value;
    this.helpForm.patchValue({
      oldName: '',
      newName: '',
      oldPhone: '',
      newPhone: '',
      oldEmail: '',
      newEmail: ''
    });
    if (selectedQuery === 'Change Name') {
      this.helpForm.addControl('oldName', new FormControl(''));
      this.helpForm.addControl('newName', new FormControl(''));
    } else {
      this.helpForm.removeControl('oldName');
      this.helpForm.removeControl('newName');
    }

    if (selectedQuery === 'Change Phone Number') {
      this.helpForm.addControl('oldPhone', new FormControl(''));
      this.helpForm.addControl('newPhone', new FormControl(''));
    } else {
      this.helpForm.removeControl('oldPhone');
      this.helpForm.removeControl('newPhone');
    }

    if (selectedQuery === 'Change Email ID') {
      this.helpForm.addControl('oldEmail', new FormControl(''));
      this.helpForm.addControl('newEmail', new FormControl(''));
    } else {
      this.helpForm.removeControl('oldEmail');
      this.helpForm.removeControl('newEmail');
    }
  }

  helpRequests: any[] = [];
  loadHelpRequests(): void {
      if(this.userEmail){
      const userEmail = this.userEmail; 
      this.helpService.getUserHelpRequests(userEmail).subscribe(
        (data) => {
          console.log(data);
          this.helpRequests = data;
        },
        (error) => {
          console.error('Error fetching help requests:', error);
        }
      );
    }
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'SENT':
        return 'status-sent';
      case 'RECEIVED':
        return 'status-received';
      case 'IN PROGRESS':
        return 'status-in-progress';
      case 'COMPLETED':
        return 'status-completed';
      default:
        return '';
    }
  }
}
