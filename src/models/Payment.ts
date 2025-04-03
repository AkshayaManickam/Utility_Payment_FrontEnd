export interface Payment {
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    invoice?: {
      id: number;
    };
  }
  