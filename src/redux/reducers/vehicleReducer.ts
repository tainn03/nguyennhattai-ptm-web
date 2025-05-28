import { VehicleOwnerType } from "@prisma/client";
import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import {
  ORDER_UPDATE_AVAILABLE_VEHICLES_SEARCH_CONDITIONS,
  VEHICLE_UPDATE_SEARCH_CONDITIONS,
  VEHICLE_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type VehicleState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
  availableVehicles: FilterOptions;
};

const initialState: VehicleState = {
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "updatedAt:desc",
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
    vehicleNumber: {
      sortLabel: "vehicle.vehicle_number",
      filters: [
        {
          filterLabel: "vehicle.vehicle_number",
          name: "vehicleNumber",
          type: "text",
          placeholder: "vehicle.vehicle_number_placeholder",
          value: "",
        },
      ],
    },
    trailerNumber: {
      sortColumn: "trailer.trailerNumber",
      sortLabel: "vehicle.vehicle_trailer",
      filters: [
        {
          filterLabel: "vehicle.vehicle_trailer",
          name: "trailerNumber",
          type: "text",
          placeholder: "vehicle.vehicle_trailer_placeholder",
          value: "",
        },
      ],
    },
    ownerType: {
      sortLabel: "vehicle.owner",
      filters: [
        {
          filterLabel: "vehicle.owner",
          name: "ownerType",
          type: "checkbox",
          value: [
            { value: VehicleOwnerType.ORGANIZATION, label: "vehicle.organization" },
            { value: VehicleOwnerType.SUBCONTRACTOR, label: "vehicle.subcontractor" },
          ],
        },
      ],
    },
    cubicMeterCapacity: {
      sortLabel: "vehicle.cube_meter",
      sortColumn: "cubicMeterCapacity",
      filters: [
        {
          filterLabel: "vehicle.cube_meter_from",
          label: "vehicle.cube_meter_from",
          name: "cubicMeterCapacityMin",
          value: "",
          type: "number",
        },
        {
          filterLabel: "vehicle.cube_meter_to",
          label: "vehicle.cube_meter_to",
          name: "cubicMeterCapacityMax",
          value: "",
          type: "number",
        },
      ],
    },
    tonPayloadCapacity: {
      sortLabel: "vehicle.weight_ton",
      sortColumn: "tonPayloadCapacity",
      filters: [
        {
          filterLabel: "vehicle.weight_ton_from",
          label: "vehicle.weight_ton_from",
          name: "tonPayloadCapacityMin",
          value: "",
          type: "number",
        },
        {
          filterLabel: "vehicle.weight_ton_to",
          label: "vehicle.weight_ton_to",
          name: "tonPayloadCapacityMax",
          value: "",
          type: "number",
        },
      ],
    },
    palletCapacity: {
      sortLabel: "vehicle.weight_pallet",
      sortColumn: "palletCapacity",
      filters: [
        {
          filterLabel: "vehicle.weight_pallet_from",
          label: "vehicle.weight_pallet_from",
          name: "palletCapacityMin",
          value: "",
          type: "number",
        },
        {
          filterLabel: "vehicle.weight_pallet_to",
          label: "vehicle.weight_pallet_to",
          name: "palletCapacityMax",
          value: "",
          type: "number",
        },
      ],
    },
    driverName: {
      sortLabel: "vehicle.driver_name",
      sortColumn: "driver.lastName",
      filters: [
        {
          filterLabel: "vehicle.driver_name",
          name: "driverName",
          type: "text",
          placeholder: "vehicle.driver_name_placeholder",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "vehicle.status",
      filters: [
        {
          filterLabel: "vehicle.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "vehicle.status_active", checked: true },
            { value: "false", label: "vehicle.status_inactive" },
          ],
        },
      ],
    },
  },
  searchQueryString: "",
  availableVehicles: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "updatedAt:desc",
      filters: [],
    },
    keywords: {
      sortLabel: "components.filter_status.keywords",
      filters: [
        {
          filterLabel: "components.filter_status.keywords",
          name: "keywords",
          type: "text",
          placeholder: "vehicle_group.keywords_placeholder",
          value: "",
        },
      ],
    },
    vehicleNumber: {
      sortLabel: "vehicle_group.vehicle_number",
      filters: [
        {
          filterLabel: "vehicle_group.vehicle_number",
          label: "vehicle_group.vehicle_number",
          name: "vehicleNumber",
          type: "text",
          placeholder: "vehicle_group.vehicle_number_placeholder",
          value: "",
        },
      ],
    },
    driverName: {
      sortLabel: "vehicle_group.driver_name",
      sortColumn: "driver.lastName",
      filters: [
        {
          filterLabel: "vehicle_group.driver_name",
          label: "vehicle_group.driver_name",
          name: "driverName",
          type: "text",
          placeholder: "vehicle_group.driver_name_placeholder",
          value: "",
        },
      ],
    },
    ownerType: {
      sortLabel: "vehicle_group.owner_type",
      filters: [
        {
          filterLabel: "vehicle_group.owner_type",
          name: "ownerType",
          type: "checkbox",
          value: [
            { value: VehicleOwnerType.ORGANIZATION, label: "vehicle_group.organization" },
            { value: VehicleOwnerType.SUBCONTRACTOR, label: "vehicle_group.subcontractor" },
          ],
        },
      ],
    },
    vehicleType: {
      sortLabel: "vehicle_group.vehicle_type",
      filters: [
        {
          filterLabel: "vehicle_group.vehicle_type",
          label: "vehicle_group.vehicle_type",
          name: "vehicleType",
          type: "text",
          placeholder: "vehicle_group.vehicle_type_placeholder",
          value: "",
        },
      ],
    },
    payloadCapacity: {
      sortLabel: "vehicle_group.payload_capacity",
      filters: [
        {
          filterLabel: "vehicle_group.payload_capacity",
          label: "vehicle_group.payload_capacity",
          name: "payloadCapacity",
          type: "number",
          placeholder: "vehicle_group.payload_capacity_placeholder",
          value: "",
        },
      ],
    },
  },
};

const vehicleReducer: Reducer<VehicleState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case VEHICLE_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case VEHICLE_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    case ORDER_UPDATE_AVAILABLE_VEHICLES_SEARCH_CONDITIONS:
      return {
        ...state,
        availableVehicles: { ...action.payload },
      };

    default:
      return state;
  }
};

export default vehicleReducer;
