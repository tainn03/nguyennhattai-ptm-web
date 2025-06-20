export type ResourceType =
  | "order"
  | "order-trip"
  | "order-trip-message"
  | "order-plan"
  | "order-monitoring"
  | "vehicle-monitoring"
  | "report-statistics-customer"
  | "report-statistics-subcontractor"
  | "report-statistics-driver"
  | "report-statistics-fuel-log"
  | "customer"
  | "customer-route"
  | "subcontractor"
  | "vehicle"
  | "trailer"
  | "maintenance"
  | "driver"
  | "advance"
  | "organization"
  | "organization-role"
  | "organization-member"
  | "organization-report"
  | "driver-license-type"
  | "driver-report"
  | "maintenance-type"
  | "merchandise-type"
  | "unit-of-measure"
  | "vehicle-type"
  | "trailer-type"
  | "custom-field"
  | "setting-others"
  | "gas-station"
  | "driver-expense"
  | "vehicle-group"
  | "order-codes"
  | "reminder"
  | "notification"
  | "trip-driver-expense"
  | "bill-of-lading"
  | "vehicle-position-tracker"
  | "customer-group"
  | "route-point"
  | "zone"
  | "order-request"
  | "customer-expense"
  | "order-trip-expense"
  | "expense-type"
  | "workflow";

export type ActionType =
  | "approve"
  | "delete-own"
  | "delete"
  | "detail"
  | "download"
  | "edit-own"
  | "edit"
  | "export"
  | "find"
  | "invite"
  | "new"
  | "pay"
  | "cancel"
  | "share"
  | "cancel-share"
  | "reject";

export type Permission = {
  resource: ResourceType;
  action: ActionType | ActionType[];
  type?: "all" | "oneOf";
};
