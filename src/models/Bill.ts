// src/models/Bill.ts
export interface Bill {
    id: number;
    serviceConnectionNumber: string;
    unitsConsumed: number;
    totalAmount: number;
    billGeneratedDate: string;
    dueDate: string;
    isPaid: string;  // If this is a boolean, it should be 'boolean' instead of 'string'
  }
  