import * as yup from "yup";

import { CustomerImportType } from "@/constants/organization";
import { NullablePartial } from "@/types";
import { UploadInputValue } from "@/types/file";
import { CustomerInfo, ZoneInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired } from "@/utils/yup";

import { OrderItemInputForm } from "./orderItem";

export type GetSheetNamesRequest = {
  customerType: CustomerImportType;
  file: UploadInputValue;
};

export type ConvertExcelToJsonRequest = {
  customer: Pick<CustomerInfo, "id" | "code" | "importDriver">;
  organizationId: number;
  file: UploadInputValue;
  sheetName: string;
};

export type JsonOrderResponse = {
  route: {
    id: number | null;
  };
  pickupPoint: {
    id: number | null;
    code: string | null;
    name: string | null;
    addressLine1: string | null;
  };
  deliveryPoint: {
    id: number | null;
    code: string | null;
    name: string | null;
    addressLine1: string | null;
    zone?: ZoneInfo | null;
  };
  weight: number;
  cbm: number | null;
  unitOfMeasure: {
    id: number | null;
  };
  zoneLv1: {
    id: number | null;
    name: string | null;
  };
  zoneLv2: {
    id: number | null;
    name: string | null;
  };
  notes: string | null;
  pickupTimeNotes: string | null;
  deliveryTimeNotes: string | null;
  items: Pick<OrderItemInputForm, "name" | "quantity">[] | null;
};

const jsonOrderResponseSchema = yup.object().shape({
  route: yup.object().shape({
    id: yup.number().nullable(),
  }),
  pickupPoint: yup.object().shape({
    id: yup.number().nullable(),
    code: yup.string().nullable(),
    name: yup.string().nullable(),
    addressLine1: yup.string().nullable(),
  }),
  deliveryPoint: yup.object().shape({
    id: yup.number().nullable(),
    code: yup.string().nullable().required(errorRequired("Mã điểm giao hàng")),
    name: yup.string().nullable(),
    addressLine1: yup.string().nullable(),
  }),
  weight: yup.number().required(errorRequired("Số lượng")).min(0, errorMin(0)).max(999999, errorMax(999999)),
  cbm: yup.number().nullable(),
  unitOfMeasure: yup.object().shape({
    id: yup.number().nullable().required(errorRequired("Đơn vị tính")),
  }),
  zoneLv1: yup.object().shape({
    id: yup.number().nullable(),
    name: yup.string().nullable(),
  }),
  zoneLv2: yup.object().shape({
    id: yup.number().nullable(),
    name: yup.string().nullable(),
  }),
  notes: yup.string().nullable().max(500, errorMaxLength(500)),
  pickupTimeNotes: yup.string().nullable().max(500, errorMaxLength(500)),
  deliveryTimeNotes: yup.string().nullable().max(500, errorMaxLength(500)),
  items: yup.array().nullable(),
});

export type ImportedOrderPreviewForm = {
  orders: JsonOrderResponse[];
};

export type ImportedOrder = Pick<
  JsonOrderResponse,
  "weight" | "cbm" | "unitOfMeasure" | "notes" | "pickupTimeNotes" | "deliveryTimeNotes" | "items"
> & {
  route?: NullablePartial<JsonOrderResponse["route"]>;
  pickupPoint?: NullablePartial<JsonOrderResponse["pickupPoint"]>;
  deliveryPoint?: NullablePartial<Omit<JsonOrderResponse["deliveryPoint"], "zone">> & {
    zone?: {
      id?: number | null;
      name?: string | null;
      parent?: {
        id?: number | null;
        name?: string | null;
      };
    };
  };
};

export type ImportedOrderInputForm = {
  clientTimezone: string;
  organizationId: number;
  customer: Pick<CustomerInfo, "id">;
  orderDate: string | Date;
  deliveryDate: string | Date;
  currentDate: string | Date;
  orders: ImportedOrder[];
};

export const importedOrderInputFormSchema = yup.object().shape({
  orders: yup.array().of(jsonOrderResponseSchema).required(errorRequired("Danh sách đơn hàng")).min(1, errorMin(1)),
});
