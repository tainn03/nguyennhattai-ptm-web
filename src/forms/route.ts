import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { OrderRouteStatusInfo, RouteInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType } from "@/utils/yup";

import { RoutePointInputForm, routePointInputFormSchema } from "./routePoint";

export enum RoutePointType {
  PICKUP = "pickupPoints",
  DELIVERY = "deliveryPoints",
}

export type RouteInputForm = MetaObject<RouteInfo> & {
  pickupPoints?: RoutePointInputForm[];
  deliveryPoints?: RoutePointInputForm[];
  routeStatuses?: MetaObject<OrderRouteStatusInfo>[];
};

export const routeInputFormSchema = yup.object<YubObjectSchema<RouteInputForm>>({
  code: yup.string().trim().required(errorRequired("customer.route.id")).max(64, errorMaxLength(64)),
  name: yup.string().trim().required(errorRequired("customer.route.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  distance: yup.number().nullable().typeError(errorType("number")).min(0, errorMin(0)).max(9999.99, errorMax(9999.99)),
  price: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999999999.999, errorMax(999999999.999)),
  subcontractorCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99)),
  driverCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  bridgeToll: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  otherCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  deliveryPoints: yup.array().of(routePointInputFormSchema),
  pickupPoints: yup.array().of(routePointInputFormSchema),
});

export type UpdateRouteInputForm = {
  route: RouteInputForm;
  lastUpdatedAt: Date | string;
};
