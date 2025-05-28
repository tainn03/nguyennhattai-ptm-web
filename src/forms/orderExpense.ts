import { Order } from "@prisma/client";

export type OrderExpenseForm = Partial<
  Pick<Order, "id" | "organizationId" | "paymentDueDate" | "totalAmount" | "notes">
> &
  Partial<{ amountPaid: number; updatedById: number }>;
