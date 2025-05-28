import { TripDriverExpenseInfo } from "@/types/strapi";

import { OrderTripInputForm } from "./orderTrip";

export type DriverExpenseInputForm = Record<string, number | string | null> &
  Pick<OrderTripInputForm, "subcontractorCost" | "bridgeToll" | "otherCost" | "notes">;

export type TripDriverExpenseRequest = Pick<
  DriverExpenseInputForm,
  "subcontractorCost" | "bridgeToll" | "otherCost" | "notes"
> & {
  data: Partial<TripDriverExpenseInfo>[];
};

export type TripDriverExpenseResetForm = {
  routeId: number;
  orderTripIds: number[];
};
