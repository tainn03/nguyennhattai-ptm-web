import { atom } from "jotai";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { FilterOptions } from "@/types/filter";

type ZoneAtomType = {
  searchConditions: FilterOptions;
  searchQueryString: string;
  adjacentZoneSearchConditions: FilterOptions;
};

const initialValue: ZoneAtomType = {
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
          placeholder: "components.filter_status.keywords_placeholder",
          name: "keywords",
          type: "text",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "zone.name",
      sortColumn: "name",
      filters: [
        {
          filterLabel: "zone.name",
          placeholder: "zone.name_placeholder",
          name: "name",
          type: "text",
          value: "",
        },
      ],
    },
    parent: {
      sortLabel: "zone.parent",
      sortColumn: "parent.name",
      filters: [
        {
          filterLabel: "zone.parent",
          placeholder: "zone.parent_placeholder",
          name: "parent",
          type: "text",
          value: "",
        },
      ],
    },
    adjacentZones: {
      sortLabel: "zone.adjacent_zones",
      sortColumn: "adjacentZones.name",
      filters: [
        {
          filterLabel: "zone.adjacent_zones",
          placeholder: "zone.adjacent_zones_placeholder",
          name: "status",
          type: "text",
          value: "",
        },
      ],
    },
    status: {
      sortLabel: "zone.status",
      sortColumn: "isActive",
      filters: [
        {
          filterLabel: "zone.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "zone.status_active", checked: true },
            { value: "false", label: "zone.status_inactive" },
          ],
        },
      ],
    },
    updatedAt: {
      sortLabel: "components.filter_status.updated_at",
      sortType: "desc",
      filters: [
        {
          label: "components.filter_status.updated_by",
          name: "updatedByUser",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
        },
        {
          filterLabel: "components.filter_status.updated_from",
          label: "components.filter_status.updated_from",
          name: "updatedAtFrom",
          type: "date",
        },
        {
          filterLabel: "components.filter_status.updated_to",
          label: "components.filter_status.updated_to",
          name: "updatedAtTo",
          type: "date",
        },
      ],
    },
  },
  searchQueryString: "",
  adjacentZoneSearchConditions: {
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
    name: {
      sortLabel: "zone.name",
      sortColumn: "name",
      filters: [
        {
          filterLabel: "zone.name",
          placeholder: "zone.name_placeholder",
          name: "name",
          type: "text",
          value: "",
        },
      ],
    },
    parent: {
      sortLabel: "zone.parent",
      sortColumn: "parent.name",
      filters: [
        {
          filterLabel: "zone.parent",
          placeholder: "zone.parent_placeholder",
          name: "parent",
          type: "text",
          value: "",
        },
      ],
    },
    adjacentZones: {
      sortLabel: "zone.adjacent_zones",
      sortColumn: "adjacentZones.name",
      filters: [
        {
          filterLabel: "zone.adjacent_zones",
          placeholder: "zone.adjacent_zones_placeholder",
          name: "adjacentZones",
          type: "text",
          value: "",
        },
      ],
    },
  },
};

export const zoneAtom = atom<ZoneAtomType>(initialValue);
