import { atom } from "jotai";

import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { FilterOptions } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

type OrderGroupAtomType = {
  customerOptions: ComboboxItem[];
  zoneOptions: ComboboxItem[];
  unitOfMeasuresOptions: ComboboxItem[];
  vehicleTypeOptions: ComboboxItem[];
  baseSearchConditions: FilterOptions;
  baseSearchQueryString: string;
  planOrderGroupSearchConditions: FilterOptions;
  planOrderGroupSearchQueryString: string;
  selectedOrders: OrderInfo[];
};

const initialValue: OrderGroupAtomType = {
  customerOptions: [],
  zoneOptions: [],
  unitOfMeasuresOptions: [],
  vehicleTypeOptions: [],
  baseSearchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "id:desc",
      filters: [],
    },
    keywords: {
      filters: [
        {
          filterLabel: "components.filter_status.keywords",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "keywords",
          type: "text",
          value: "",
        },
      ],
    },
    code: {
      sortLabel: "order_group.id",
      sortColumn: "code",
      filters: [
        {
          filterLabel: "order_group.id",
          placeholder: "order_group.id_placeholder",
          name: "code",
          type: "text",
          value: "",
        },
      ],
    },
    customer: {
      sortLabel: "order_group.customer",
      sortColumn: "customer.name",
      filters: [
        {
          filterLabel: "order_group.customer",
          placeholder: "order_group.customer_placeholder",
          name: "customerId",
          type: "combobox",
          value: "",
          items: [],
        },
      ],
    },
    pickupPoint: {
      sortLabel: "order_group.pickup_point",
      sortColumn: "pickupPoint",
      filters: [
        {
          label: "order_group.point_and_address",
          filterLabel: "order_group.pickup_point",
          placeholder: "order_group.pickup_point_placeholder",
          name: "pickupPoint",
          type: "text",
          value: "",
        },
        {
          label: "order_group.zone",
          filterLabel: "order_group.zone",
          placeholder: "order_group.zone_placeholder",
          name: "pickupZoneId",
          type: "combobox",
          value: "",
          items: [],
        },
        {
          label: "order_group.adjacent_zone",
          filterLabel: "order_group.adjacent_zone",
          placeholder: "order_group.adjacent_zone_placeholder",
          name: "pickupAdjacentZoneId",
          type: "combobox",
          value: "",
          items: [],
        },
      ],
    },
    deliveryPoint: {
      sortLabel: "order_group.delivery_point",
      sortColumn: "deliveryPoint",
      filters: [
        {
          label: "order_group.address",
          filterLabel: "order_group.delivery_point",
          placeholder: "order_group.delivery_point_placeholder",
          name: "deliveryPoint",
          type: "text",
          value: "",
        },
        {
          label: "order_group.zone",
          filterLabel: "order_group.zone",
          placeholder: "order_group.zone_placeholder",
          name: "deliveryZoneId",
          type: "combobox",
          value: "",
          items: [],
        },
        {
          label: "order_group.adjacent_zone",
          filterLabel: "order_group.adjacent_zone",
          placeholder: "order_group.adjacent_zone_placeholder",
          name: "deliveryAdjacentZoneId",
          type: "combobox",
          value: "",
          items: [],
        },
      ],
    },
    orderDate: {
      sortLabel: "order_group.order_date",
      sortColumn: "orderDate",
      filters: [
        {
          label: "order_group.order_date_from",
          filterLabel: "order_group.order_date_from",
          placeholder: "order_group.order_date_from_placeholder",
          name: "orderDateFrom",
          type: "date",
          value: "",
        },
        {
          label: "order_group.order_date_to",
          filterLabel: "order_group.order_date_to",
          placeholder: "order_group.order_date_to_placeholder",
          name: "orderDateTo",
          type: "date",
          value: "",
        },
      ],
    },
    weight: {
      sortLabel: "order_group.quantity",
      sortColumn: "weight",
      filters: [
        {
          label: "order_group.quantity",
          filterLabel: "order_group.quantity",
          placeholder: "order_group.quantity_placeholder",
          name: "weight",
          type: "number",
          value: "",
        },
        {
          label: "order_group.unit",
          filterLabel: "order_group.unit",
          placeholder: "order_group.unit_placeholder",
          name: "unitId",
          type: "combobox",
          value: "",
          items: [],
        },
      ],
    },
    cbm: {
      sortLabel: "order_group.cbm",
      sortColumn: "cbm",
      filters: [
        {
          filterLabel: "order_group.cbm",
          placeholder: "order_group.cbm_placeholder",
          name: "cbm",
          type: "number",
          value: "",
        },
      ],
    },
  },
  baseSearchQueryString: "",
  planOrderGroupSearchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "id:desc",
      filters: [],
    },
    keywords: {
      filters: [
        {
          filterLabel: "components.filter_status.keywords",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "keywords",
          type: "text",
          value: "",
        },
      ],
    },
    code: {
      sortLabel: "order_group.id",
      sortColumn: "code",
      filters: [
        {
          filterLabel: "order_group.id",
          placeholder: "order_group.id_placeholder",
          name: "code",
          type: "text",
          value: "",
        },
      ],
    },
    vehicle: {
      sortLabel: "order_group.vehicle",
      sortColumn: "orders.trips.vehicle.vehicleNumber",
      filters: [
        {
          filterLabel: "order_group.vehicle",
          placeholder: "order_group.vehicle_placeholder",
          name: "vehicle",
          type: "text",
          value: "",
        },
      ],
    },
    vehicleType: {
      sortLabel: "order_group.vehicle_type",
      sortColumn: "orders.trips.vehicle.type.name",
      filters: [
        {
          filterLabel: "order_group.vehicle_type",
          placeholder: "order_group.vehicle_type_placeholder",
          name: "vehicleType",
          type: "combobox",
          value: "",
          items: [],
        },
      ],
    },
    driver: {
      sortLabel: "order_group.driver",
      sortColumn: "orders.trips.driver.firstName",
      filters: [
        {
          filterLabel: "order_group.driver",
          placeholder: "order_group.driver_placeholder",
          name: "driver",
          type: "text",
          value: "",
        },
      ],
    },
    pickupDate: {
      sortLabel: "order_group.order_date",
      sortColumn: "orders.trips.pickupDate",
      filters: [
        {
          label: "order_group.order_date_from",
          filterLabel: "order_group.order_date_from",
          placeholder: "order_group.order_date_from_placeholder",
          name: "pickupDateFrom",
          type: "date",
          value: "",
        },
        {
          label: "order_group.order_date_to",
          filterLabel: "order_group.order_date_to",
          placeholder: "order_group.order_date_to_placeholder",
          name: "pickupDateTo",
          type: "date",
          value: "",
        },
      ],
    },
    customer: {
      sortLabel: "order_group.customer",
      sortColumn: "orders.customer.name",
      filters: [
        {
          filterLabel: "order_group.customer",
          placeholder: "order_group.customer_placeholder",
          name: "customerId",
          type: "combobox",
          value: "",
          items: [],
        },
      ],
    },
  },
  planOrderGroupSearchQueryString: "",
  selectedOrders: [],
};

export const orderGroupAtom = atom<OrderGroupAtomType>(initialValue);
