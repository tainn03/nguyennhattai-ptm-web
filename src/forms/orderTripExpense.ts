import { UploadFile } from "@prisma/client";

import { UploadInputValue } from "@/types/file";

export type OrderTripExpenseInput = {
  id?: number;
  amount?: number;
  notes?: string;
  expenseTypeId?: number;
  orderTripId?: number;
};

export type OrderTripExpenseInputForm = {
  orderTripExpenses: OrderTripExpenseInput[];
};

export type OrderTripExpenseFileInputForm = {
  orderTripExpenseId: number;
  previousDocuments: Partial<UploadFile>[];
  currentDocuments: UploadInputValue[];
};

export type OrderTripExpenseInputFormForDriverApp = {
  id: number;
  amount?: number;
  expenseTypeId: number;
  orderTripId: number;
  notes?: string;
  previousDocuments?: Partial<UploadFile>[];
  currentDocuments?: UploadInputValue[];
};
