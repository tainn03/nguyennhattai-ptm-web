import { AnyObject } from "@/types";
import { randomInt } from "@/utils/number";

const expenseTypes = [
  { name: "Phí vận chuyển", key: "delivery_fee", type: "expense" },
  { name: "Phí phát sinh", key: "extra_fee", type: "expense" },
  { name: "Phí hoàn tiền", key: "refund_fee", type: "income" },
  { name: "Phí tạm ứng", key: "advance_fee", type: "income" },
  { name: "Phí cân nặng", key: "weight_fee", type: "expense" },
  { name: "Phí cước", key: "postage_fee", type: "expense" },
  { name: "Phí thu hộ", key: "cod_fee", type: "expense" },
  { name: "Phí bảo hiểm", key: "insurance_fee", type: "expense" },
  { name: "Phí xử lý", key: "handling_fee", type: "income" },
  { name: "Phí đóng gói", key: "packing_fee", type: "expense" },
  { name: "Phí bốc xếp", key: "loading_fee", type: "expense" },
  { name: "Phí chờ", key: "waiting_fee", type: "income" },
  { name: "Phí hủy", key: "cancel_fee", type: "expense" },
  { name: "Phí trễ", key: "late_fee", type: "expense" },
  { name: "Phí đổi địa chỉ", key: "address_change_fee", type: "expense" },
  { name: "Phí khác", key: "other_fee", type: "expense" },
];

export const generateRandomExpense = (id: number): AnyObject => {
  const expense = expenseTypes[randomInt(0, expenseTypes.length - 1)];
  return {
    id,
    name: expense.name,
    key: expense.key,
    allowDriverInput: Math.random() < 0.5,
    allowDriverView: true,
    isActive: Math.random() < 0.5,
    description: `Description for ${expense.name}`,
    createdAt: new Date(),
    createdByUser: {
      id: randomInt(1, 100),
      detail: {
        firstName: "Tâm",
        lastName: "Hoàng",
      },
    },
    updatedAt: new Date(),
    updatedByUser: {
      id: randomInt(1, 100),
      detail: {
        firstName: "Tâm",
        lastName: "Hoàng",
      },
    },
    type: expense.type,
  };
};

export const customerExpensesFetcher = async (): Promise<AnyObject[]> => {
  return Array.from({ length: 10 }, (_, index) => generateRandomExpense(index + 1));
};

export const customerExpenseFetcher = async (): Promise<AnyObject> => {
  return generateRandomExpense(1);
};
