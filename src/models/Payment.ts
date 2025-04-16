export interface Transaction {
  transactionId: number;
  totalAmount: number;
  discountType: string;
  amountPaid: number;
  paymentMethod: string;
  transactionStatus: string;
  transactionDate: string;
  invoice: {
    id: number;
    serviceConnectionNumber: string;
    unitsConsumed: number;
    totalAmount: number;
    billGeneratedDate: string;
  };
}

export interface PaymentResponse {
  transactions: Transaction[];
}
