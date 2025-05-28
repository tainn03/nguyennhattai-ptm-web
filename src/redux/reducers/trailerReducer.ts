import { TrailerOwnerType } from "@prisma/client";
import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { TRAILER_UPDATE_SEARCH_CONDITIONS, TRAILER_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type VehicleState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
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
    trailerNumber: {
      sortLabel: "trailer.trailer_number",
      filters: [
        {
          filterLabel: "trailer.trailer_number",
          name: "trailerNumber",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
        },
      ],
    },
    idNumber: {
      sortLabel: "trailer.trailer_id_number",
      filters: [
        {
          filterLabel: "trailer.trailer_id_number",
          name: "idNumber",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
        },
      ],
    },
    ownerType: {
      sortLabel: "trailer.owner",
      filters: [
        {
          filterLabel: "trailer.owner",
          name: "ownerType",
          type: "checkbox",
          value: [
            { value: TrailerOwnerType.ORGANIZATION, label: "trailer.organization" },
            { value: TrailerOwnerType.SUBCONTRACTOR, label: "trailer.subcontractor" },
          ],
        },
      ],
    },
    cubicMeterCapacity: {
      sortLabel: "trailer.cube_meter",
      sortColumn: "cubicMeterCapacity",
      filters: [
        {
          filterLabel: "trailer.cube_meter_from",
          label: "trailer.cube_meter_from",
          name: "cubicMeterCapacityMin",
          value: "",
          type: "number",
        },
        {
          filterLabel: "trailer.cube_meter_to",
          label: "trailer.cube_meter_to",
          name: "cubicMeterCapacityMax",
          value: "",
          type: "number",
        },
      ],
    },
    tonPayloadCapacity: {
      sortLabel: "trailer.weight_ton",
      sortColumn: "tonPayloadCapacity",
      filters: [
        {
          filterLabel: "trailer.weight_ton_from",
          label: "trailer.weight_ton_from",
          name: "tonPayloadCapacityMin",
          value: "",
          type: "number",
        },
        {
          filterLabel: "trailer.weight_ton_to",
          label: "trailer.weight_ton_to",
          name: "tonPayloadCapacityMax",
          value: "",
          type: "number",
        },
      ],
    },
    palletCapacity: {
      sortLabel: "trailer.weight_pallet",
      sortColumn: "palletCapacity",
      filters: [
        {
          filterLabel: "trailer.weight_pallet_from",
          label: "trailer.weight_pallet_from",
          name: "palletCapacityMin",
          value: "",
          type: "number",
        },
        {
          filterLabel: "trailer.weight_pallet_to",
          label: "trailer.weight_pallet_to",
          name: "palletCapacityMax",
          value: "",
          type: "number",
        },
      ],
    },
    vehicle: {
      sortLabel: "trailer.vehicle",
      sortColumn: "vehicle.vehicleNumber",
      filters: [
        {
          filterLabel: "trailer.vehicle",
          name: "vehicle",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "trailer.status",
      filters: [
        {
          filterLabel: "trailer.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "trailer.status_active", checked: true },
            { value: "false", label: "trailer.status_inactive" },
          ],
        },
      ],
    },
  },
  searchQueryString: "",
};

const trailerReducer: Reducer<VehicleState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case TRAILER_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case TRAILER_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default trailerReducer;
