import { MetaObject } from "@/types/customField";
import { OrderRouteStatusInfo, RoutePointInfo } from "@/types/strapi";

export type OrderRouteStatusInputForm = MetaObject<Omit<OrderRouteStatusInfo, "routePoint">> & {
  routePoint?: MetaObject<RoutePointInfo>;
};

export const initialFormValues: OrderRouteStatusInputForm = {
  customFields: {},
};
