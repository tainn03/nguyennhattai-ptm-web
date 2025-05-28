import { atom } from "jotai";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { FilterOptions } from "@/types/filter";

type RoutePointAtomType = {
  searchConditions: FilterOptions;
  searchQueryString: string;
  adjacentPointSearchConditions: FilterOptions;
  routePointListModalConditions: FilterOptions;
};

const initialValue: RoutePointAtomType = {
  searchConditions: {
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
          name: "keywords",
          type: "text",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "common.status",
      sortColumn: "isActive",
      filters: [
        {
          filterLabel: "common.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "route_point.status_active", checked: true },
            { value: "false", label: "route_point.status_inactive" },
          ],
        },
      ],
    },
    code: {
      sortLabel: "route_point.code",
      filters: [
        {
          filterLabel: "route_point.code",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "code",
          type: "text",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "route_point.name",
      filters: [
        {
          filterLabel: "route_point.name",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "name",
          type: "text",
          value: "",
        },
      ],
    },
    zone: {
      sortLabel: "route_point.zone",
      sortColumn: "zone.name",
      filters: [
        {
          filterLabel: "route_point.zone",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "zone",
          type: "text",
          value: "",
        },
      ],
    },
    adjacentPoints: {
      sortLabel: "route_point.nearby_points",
      sortColumn: "adjacentPoints.name",
      filters: [
        {
          filterLabel: "route_point.nearby_points",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "adjacentPoints",
          type: "text",
          value: "",
        },
      ],
    },
    pickupTimes: {
      sortLabel: "route_point.pickup_time",
      filters: [],
    },
    deliveryTimes: {
      sortLabel: "route_point.delivery_time",
      filters: [],
    },
    vehicleTypes: {
      sortLabel: "route_point.vehicle_type",
      sortColumn: "vehicleTypes.name",
      filters: [
        {
          filterLabel: "route_point.vehicle_type",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "vehicleTypes",
          type: "text",
          value: "",
        },
      ],
    },
  },
  searchQueryString: "",
  adjacentPointSearchConditions: {
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
          name: "keywords",
          type: "text",
          value: "",
        },
      ],
    },
    code: {
      sortLabel: "route_point.code",
      filters: [
        {
          filterLabel: "route_point.code",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "code",
          type: "text",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "route_point.name",
      filters: [
        {
          filterLabel: "route_point.name",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "name",
          type: "text",
          value: "",
        },
      ],
    },
    zone: {
      sortLabel: "route_point.zone",
      sortColumn: "zone.name",
      filters: [
        {
          filterLabel: "route_point.zone",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "zone",
          type: "text",
          value: "",
        },
      ],
    },
    adjacentPoints: {
      sortLabel: "route_point.nearby_points",
      sortColumn: "adjacentPoints.name",
      filters: [
        {
          filterLabel: "route_point.nearby_points",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "adjacentPoints",
          type: "text",
          value: "",
        },
      ],
    },
    pickupTimes: {
      sortLabel: "route_point.pickup_time",
      filters: [],
    },
    deliveryTimes: {
      sortLabel: "route_point.delivery_time",
      filters: [],
    },
    vehicleTypes: {
      sortLabel: "route_point.vehicle_type",
      sortColumn: "vehicleTypes.name",
      filters: [
        {
          filterLabel: "route_point.vehicle_type",
          placeholder: "components.filter_status.keywords_placeholder",
          name: "vehicleTypes",
          type: "text",
          value: "",
        },
      ],
    },
  },
  routePointListModalConditions: {
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
      sortLabel: "components.route_point_list_modal.code",
      sortColumn: "code",
      filters: [
        {
          filterLabel: "components.route_point_list_modal.code",
          placeholder: "components.route_point_list_modal.code_placeholder",
          name: "code",
          type: "text",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "components.route_point_list_modal.name",
      sortColumn: "name",
      filters: [
        {
          filterLabel: "components.route_point_list_modal.name",
          placeholder: "components.route_point_list_modal.name_placeholder",
          name: "route",
          type: "text",
          value: "",
        },
      ],
    },
    zone: {
      sortLabel: "components.route_point_list_modal.zone",
      sortColumn: "zone.name",
      filters: [
        {
          filterLabel: "components.route_point_list_modal.zone",
          placeholder: "components.route_point_list_modal.zone_placeholder",
          name: "zone",
          type: "text",
          value: "",
        },
      ],
    },
    adjacentPoints: {
      sortLabel: "components.route_point_list_modal.adjacent_points",
      sortColumn: "adjacentPoints.name",
      filters: [
        {
          filterLabel: "components.route_point_list_modal.adjacent_points",
          placeholder: "components.route_point_list_modal.adjacent_points_placeholder",
          name: "adjacentPoints",
          type: "text",
          value: "",
        },
      ],
    },
    pickupTimes: {
      sortLabel: "components.route_point_list_modal.pickup_times",
      sortColumn: "pickupTimes",
      filters: [],
    },
    deliveryTimes: {
      sortLabel: "components.route_point_list_modal.delivery_times",
      sortColumn: "deliveryTimes",
      filters: [],
    },
    vehicleTypes: {
      sortLabel: "components.route_point_list_modal.vehicle_types",
      sortColumn: "vehicleTypes.name",
      filters: [
        {
          filterLabel: "components.route_point_list_modal.vehicle_types",
          placeholder: "components.route_point_list_modal.vehicle_types_placeholder",
          name: "vehicleTypes",
          type: "text",
          value: "",
        },
      ],
    },
  },
};

export const routePointAtom = atom<RoutePointAtomType>(initialValue);
