import { CustomerType, OrderTripStatusType, RouteType } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { CustomerInfo, OrderInfo, RouteInfo, UnitOfMeasureInfo } from "@/types/strapi";
import { calculateDateDifferenceInMinutes } from "@/utils/date";
import {
  errorFormat,
  errorMax,
  errorMaxLength,
  errorMin,
  errorRequired,
  errorType,
  formatErrorMessage,
} from "@/utils/yup";

import { CustomerInputForm } from "./customer";
import { RouteInputForm } from "./route";

export const initialFormValues: OrderInputForm = {
  customerId: null,
  routeId: null,
  customer: {
    id: 0,
    type: CustomerType.FIXED,
    name: "",
    code: "",
    taxCode: null,
    email: null,
    phoneNumber: null,
    website: null,
    businessAddress: null,
    contactName: null,
    contactPosition: null,
    contactEmail: null,
    contactPhoneNumber: null,
    isActive: true,
    description: null,
    bankAccount: {
      accountNumber: null,
      holderName: null,
      bankName: null,
      bankBranch: null,
      description: null,
    },
  },
  route: {
    id: 0,
    type: RouteType.FIXED,
    code: "",
    name: "",
    description: null,
    isActive: true,
    pickupPoints: [],
    deliveryPoints: [],
    distance: null,
    price: null,
    subcontractorCost: null,
    driverCost: null,
    bridgeToll: null,
    otherCost: null,
  },
  orderDate: startOfDay(new Date()),
  deliveryDate: endOfDay(new Date()),
  unit: {
    id: 0,
  },
  weight: null,
  cbm: null,
  totalAmount: null,
  paymentDueDate: null,
  notes: null,
  merchandiseTypes: [],
  merchandiseNote: null,
  routeStatuses: [],
  isDraft: false,
};

export type OrderInputForm = MetaObject<OrderInfo> & {
  customerId?: number | null;
  customerCode?: string | null;
  routeId?: number | null;
  unitOfMeasureId?: number | null;
};

export type UpdateOrderInputForm = OrderInputForm & {
  lastCustomer: CustomerInputForm;
  lastRoute: RouteInputForm;
  lastUpdatedAt?: Date | string;
};

export type OrderStatusChangeForm = {
  order: Partial<Pick<OrderInfo, "id" | "code" | "deliveryDate" | "updatedByUser" | "trips">>;
  lastUpdatedAt?: Date | string;
};

export type AutoDispatchInputForm = {
  order: Pick<OrderInfo, "id" | "code" | "deliveryDate">;
  lastUpdatedAt?: Date | string;
  tripIds: number[];
  lastStatusTypes: OrderTripStatusType[];
};

export type OrderMerchandiseTypeCardModalInputForm = Partial<Pick<OrderInfo, "merchandiseNote" | "merchandiseTypes">>;

export type OrderDetailModalInputForm = Partial<OrderInfo> & {
  unitOfMeasureId: number | null;
};

export type DeleteOrdersForm = {
  clientTimezone: string;
  orderIds: number[];
};

export const orderInputFormSchema = yup.object<YubObjectSchema<OrderInputForm>>({
  isDraft: yup.boolean(),
  orderDate: yup.date().typeError(errorFormat("order.order_date")).required(errorRequired("order.order_date")),
  deliveryDate: yup
    .date()
    .typeError(errorFormat("order.delivery_date"))
    .nullable()
    .when("orderDate", (data, schema) => {
      if (data && data[0] !== null) {
        return schema.test("deliveryDate", formatErrorMessage("order.error_delivery_date"), (deliveryDate) => {
          return deliveryDate ? calculateDateDifferenceInMinutes(deliveryDate, data[0]) >= 0 : true;
        });
      }
      return schema.nullable();
    }),
  customerId: yup
    .number()
    .typeError(errorRequired("order.customer"))
    .when("customer.type", (data, schema) => {
      if (data && data[0] === CustomerType.FIXED) {
        return schema.min(1, errorRequired("order.customer")).required(errorRequired("order.customer"));
      }

      return schema.nullable();
    }),
  customer: yup.object<YubObjectSchema<CustomerInfo>>({
    type: yup.string(),
    name: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.required(errorRequired("order.customer")).max(255, errorMaxLength(255));
        }
        return schema.nullable();
      }),
    taxCode: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(20, errorMaxLength(20)).nullable();
        }
        return schema.nullable();
      }),
    email: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.email(errorFormat("order.email")).max(255, errorMaxLength(255)).nullable();
        }
        return schema.nullable();
      }),
    phoneNumber: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(20, errorMaxLength(20)).nullable();
        }
        return schema.nullable();
      }),
    website: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.url(errorFormat("order.url")).max(2048, errorMaxLength(2048)).nullable();
        }
        return schema.nullable();
      }),
    businessAddress: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(255, errorMaxLength(255)).nullable();
        }
        return schema.nullable();
      }),
    description: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(500, errorMaxLength(500)).nullable();
        }
        return schema.nullable();
      }),
  }),
  routeId: yup
    .number()
    .typeError(errorRequired("order.route"))
    .when("route.type", (data, schema) => {
      if (data && data[0] === RouteType.FIXED) {
        return schema.min(1, errorRequired("order.route")).required(errorRequired("order.route"));
      }
      return schema.nullable();
    }),
  route: yup.object<YubObjectSchema<RouteInfo>>({
    type: yup.string(),
    pickupPoints: yup.array().when("type", (data, schema) => {
      if (data && data[0] === RouteType.NON_FIXED) {
        return schema.min(1, errorRequired("order.pickup_point")).required(errorRequired("order.pickup_point"));
      }
      return schema.nullable();
    }),
    deliveryPoints: yup.array().when("type", (data, schema) => {
      if (data && data[0] === RouteType.NON_FIXED) {
        return schema.min(1, errorRequired("order.delivery_point")).required(errorRequired("order.delivery_point"));
      }
      return schema.nullable();
    }),
    name: yup.string().max(30, errorMaxLength(30)).nullable(),
  }),
  unit: yup.object<YubObjectSchema<UnitOfMeasureInfo>>({
    id: yup
      .number()
      .typeError(errorRequired("order.unit_of_measure"))
      .min(1, errorRequired("order.unit_of_measure"))
      .required(errorRequired("order.unit_of_measure")),
  }),
  weight: yup
    .number()
    .typeError(errorType("number"))
    .required(errorRequired("order.weight"))
    .moreThan(0, errorMin(0))
    .max(999999.99, errorMax(999999.99)),
  cbm: yup.number().typeError(errorType("number")).min(0, errorMin(0)).max(9999.999, errorMax(9999.999)).nullable(),
  totalAmount: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99))
    .nullable(),
  paymentDueDate: yup.date().typeError(errorFormat("order.payment_due_date")).nullable(),
  notes: yup.string().max(500, errorMaxLength(500)).nullable(),
  merchandiseNote: yup.string().max(500, errorMaxLength(500)).nullable(),
});

export const orderDraftInputFormSchema = yup.object<YubObjectSchema<OrderInputForm>>({
  isDraft: yup.boolean(),
  orderDate: yup.date().typeError(errorFormat("order.order_date")).required(errorRequired("order.order_date")),
  deliveryDate: yup.date().typeError(errorFormat("order.delivery_date")).nullable(),
  customer: yup.object<YubObjectSchema<CustomerInfo>>({
    type: yup.string(),
    id: yup
      .number()
      .typeError(errorFormat("order.customer"))
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.FIXED) {
          return schema.min(0, errorFormat("order.customer")).nullable();
        }
        return schema.nullable();
      }),
    name: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(255, errorMaxLength(255)).nullable();
        }
        return schema.nullable();
      }),
    taxCode: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(20, errorMaxLength(20)).nullable();
        }
        return schema.nullable();
      }),
    email: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.email(errorFormat("order.email")).max(255, errorMaxLength(255)).nullable();
        }
        return schema.nullable();
      }),
    phoneNumber: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(20, errorMaxLength(20)).nullable();
        }
        return schema.nullable();
      }),
    website: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.url(errorFormat("order.url")).max(2048, errorMaxLength(2048)).nullable();
        }
        return schema.nullable();
      }),
    businessAddress: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(255, errorMaxLength(255)).nullable();
        }
        return schema.nullable();
      }),
    description: yup
      .string()
      .trim()
      .when("type", (data, schema) => {
        if (data && data[0] === CustomerType.CASUAL) {
          return schema.max(500, errorMaxLength(500)).nullable();
        }
        return schema.nullable();
      }),
  }),
  route: yup.object<YubObjectSchema<RouteInfo>>({
    type: yup.string(),
    id: yup
      .number()
      .typeError(errorRequired("order.route"))
      .when("type", (data, schema) => {
        if (data && data[0] === RouteType.FIXED) {
          return schema.min(0, errorFormat("order.route")).nullable();
        }
        return schema.nullable();
      }),
    pickupPoints: yup.array().when("type", (data, schema) => {
      if (data && data[0] === RouteType.NON_FIXED) {
        return schema.min(0, errorFormat("order.pickup_point")).nullable();
      }
      return schema.nullable();
    }),
    deliveryPoints: yup.array().when("type", (data, schema) => {
      if (data && data[0] === RouteType.NON_FIXED) {
        return schema.min(0, errorFormat("order.delivery_point")).nullable();
      }
      return schema.nullable();
    }),
    name: yup.string().max(30, errorMaxLength(30)).nullable(),
  }),
  unit: yup.object<YubObjectSchema<UnitOfMeasureInfo>>({
    id: yup
      .number()
      .typeError(errorRequired("order.unit_of_measure"))
      .min(0, errorFormat("order.unit_of_measure"))
      .nullable(),
  }),
  weight: yup
    .number()
    .typeError(errorType("number"))
    .moreThan(0, errorMin(0))
    .max(999999.99, errorMax(999999999.99))
    .nullable(),
  totalAmount: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99))
    .nullable(),
  paymentDueDate: yup.date().typeError(errorFormat("order.payment_due_date")).nullable(),
  notes: yup.string().max(500, errorMaxLength(500)).nullable(),
  merchandiseNote: yup.string().max(500, errorMaxLength(500)).nullable(),
});

export const orderDetailModalInputSchema = yup.object<YubObjectSchema<OrderDetailModalInputForm>>({
  orderDate: yup
    .date()
    .typeError(errorFormat("order.order_detail.order_detail_modal_order_date"))
    .required(errorRequired("order.order_detail.order_detail_modal_order_date")),
  deliveryDate: yup
    .date()
    .typeError(errorFormat("order.order_detail.order_detail_modal_delivery_date"))
    .nullable()
    .when("orderDate", (data, schema) => {
      if (data && data[0] !== null) {
        return schema.test(
          "deliveryDate",
          formatErrorMessage("order.order_detail.order_detail_modal_date_validate", {
            date: "order.order_detail.order_detail_modal_order_date",
          }),
          (deliveryDate) => {
            return deliveryDate ? calculateDateDifferenceInMinutes(deliveryDate, data[0]) >= 0 : true;
          }
        );
      }
      return schema.nullable();
    }),
  weight: yup
    .number()
    .typeError(errorType("number"))
    .required(errorRequired("order.order_detail.order_detail_modal_weight"))
    .moreThan(0, errorMin(0))
    .max(999999.99, errorMax(999999.99)),
  cbm: yup.number().typeError(errorType("number")).min(0, errorMin(0)).max(9999.999, errorMax(9999.999)).nullable(),
  totalAmount: yup
    .number()
    .typeError(errorFormat("order.order_detail.order_detail_modal_total_amount"))
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99))
    .nullable(),
  paymentDueDate: yup
    .date()
    .typeError(errorFormat("order.order_detail.order_detail_modal_payment_due_date"))
    .nullable(),
  notes: yup.string().max(500, errorMaxLength(500)).nullable(),
});

export const orderMerchandiseTypeCardModalInputSchema = yup.object<
  YubObjectSchema<OrderMerchandiseTypeCardModalInputForm>
>({
  merchandiseNote: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});

export const routeNameModalInputSchema = yup.object<YubObjectSchema<RouteInputForm>>({
  name: yup.string().max(30, errorMaxLength(30)).nullable(),
});
