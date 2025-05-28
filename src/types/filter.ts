/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { SelectItem } from "@/components/molecules/Select/Select";
import { AnyObject } from "@/types";
import { Pagination } from "@/types/graphql";

export type FilterProperty = {
  filterLabel?: string;
  label?: string;
  name: string;
  id?: string;
  placeholder?: string;
  type?: "text" | "number" | "checkbox" | "date" | "combobox" | "select" | "dropdown";
  value?: number | string | CheckboxItem[] | Date | string[];
  items?: ComboboxItem[] | SelectItem[];
  checked?: boolean;
  isShowBtnDelete?: boolean;
  optionSelected?: ComboboxItem | SelectItem;
  hideSelectedSubLabel?: boolean;
};

export type SortType = "asc" | "desc";

export type FilterOptions = {
  [columnName: string]: AnyObject & {
    sortLabel?: string;
    sortColumn?: string;
    sortType?: SortType;
    filters: FilterProperty[];
  };
};

export type FilterRequest<T = any> = AnyObject &
  Partial<T> &
  Partial<Pick<Pagination, "page" | "pageSize">> & {
    limit?: number;
    sort?: string | string[];
  };
