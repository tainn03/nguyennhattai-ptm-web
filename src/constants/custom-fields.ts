import { CustomFieldDataType, CustomFieldType } from "@prisma/client";

import { SelectItem } from "@/components/molecules/Select/Select";
import { CustomFieldSelectItem } from "@/types/customField";

export const CUSTOM_FIELD_TYPE: CustomFieldSelectItem[] = [
  {
    value: CustomFieldType.CUSTOMER,
    label: "custom_field.feature_customer",
    modelSchema: "Customer",
  },
  {
    value: CustomFieldType.SUBCONTRACTOR,
    label: "custom_field.feature_subcontractor",
    modelSchema: "Subcontractor",
  },
  {
    value: CustomFieldType.DRIVER,
    label: "custom_field.feature_driver",
    modelSchema: "Driver",
  },
  {
    value: CustomFieldType.ORDER,
    label: "custom_field.feature_order",
    modelSchema: "Order",
  },
  {
    value: CustomFieldType.VEHICLE,
    label: "custom_field.feature_vehicle",
    modelSchema: "Vehicle",
  },
  {
    value: CustomFieldType.TRAILER,
    label: "custom_field.feature_trailer",
    modelSchema: "Trailer",
  },
  {
    value: CustomFieldType.ROUTE_POINT,
    label: "custom_field.feature_route_point",
    modelSchema: "RoutePoint",
  },
  {
    value: CustomFieldType.ORDER_TRIP,
    label: "custom_field.feature_order_trip",
    modelSchema: "OrderTrip",
  },
];

export const CUSTOM_FIELD_DATA_TYPE: SelectItem[] = [
  {
    value: CustomFieldDataType.TEXT,
    label: "Text",
  },
  {
    value: CustomFieldDataType.EMAIL,
    label: "Email",
  },
  {
    value: CustomFieldDataType.NUMBER,
    label: "Number",
  },
  {
    value: CustomFieldDataType.CHOICE,
    label: "Choice",
  },
  {
    value: CustomFieldDataType.DATE,
    label: "Date",
  },
  {
    value: CustomFieldDataType.DATETIME,
    label: "Date Time",
  },
  {
    value: CustomFieldDataType.BOOLEAN,
    label: "Boolean",
  },
  {
    value: CustomFieldDataType.FILE,
    label: "File",
  },
];
