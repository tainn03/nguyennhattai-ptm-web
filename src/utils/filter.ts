import cloneDeep from "lodash/cloneDeep";
import moment from "moment";
import { ReadonlyURLSearchParams } from "next/navigation";

import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { AnyObject } from "@/types";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { formatDate } from "./date";
import { decryptId, encryptId } from "./security";

/**
 * Checks if a filter property has active filters based on its type.
 *
 * @param {FilterProperty} filterItem - The filter property to check.
 * @returns {boolean} True if the filter has active filters, otherwise false.
 */
export const hasFilter = (filterItem: FilterProperty) => {
  if (filterItem.type === "checkbox") {
    return (filterItem.value as CheckboxItem[])?.some((item) => item.checked);
  } else if (filterItem.type === "number") {
    return isNumeric(filterItem.value);
  } else if (filterItem.type === "combobox") {
    return filterItem.optionSelected ? true : false;
  } else if (filterItem.type === "dropdown") {
    return ((filterItem.value ?? []) as string[]).length > 0;
  } else {
    return !!filterItem.value;
  }
};

/**
 * Get active filter properties from a collection of filter options.
 *
 * @param {FilterOptions} filterOptions - The collection of filter options to process.
 * @returns {FilterProperty[]} An array of active filter properties.
 */
export const getFilterProperties = (filterOptions: FilterOptions) => {
  const result: FilterProperty[] = [];
  const { pagination: _, ...otherFilterOptions } = filterOptions;
  for (const columnName in otherFilterOptions) {
    const option = filterOptions[columnName];
    for (let i = 0; i < option.filters.length; i++) {
      const filterItem = option.filters[i];
      if (hasFilter(filterItem)) {
        result.push(filterItem);
      }
    }
  }
  return result;
};

/**
 * Get a filter request object based on the selected filter properties, pagination, and sorting options.
 *
 * @param {FilterOptions} filterOptions - The collection of filter options with selected filter values.
 * @returns {AnyObject} A filter request object including pagination, sorting, and selected filter values.
 */
export const getFilterRequest = (filterOptions: FilterOptions) => {
  const filterObject: AnyObject = {};
  const filterProperties = getFilterProperties(filterOptions);
  filterProperties.forEach((item) => {
    if (item.type === "checkbox") {
      filterObject[item.name] = (item.value as CheckboxItem[])
        .filter(({ checked }) => checked)
        .map(({ value }) => value);
    } else if (item.type === "combobox") {
      // In case,  item type is combo box then set value of item is value of properties option selected
      filterObject[item.name] = item.optionSelected?.value;
    } else {
      filterObject[item.name] = item.value;
    }
  });

  const { page, pageSize, defaultSort } = filterOptions.pagination;

  // Find the column to be sorted based on filter options
  const sortColumn = Object.keys(filterOptions).find((key) => filterOptions[key].sortType);
  let sort = defaultSort;
  if (sortColumn && filterOptions[sortColumn].sortColumn) {
    sort = `${filterOptions[sortColumn].sortColumn}:${filterOptions[sortColumn].sortType}`;
  } else if (sortColumn) {
    sort = `${sortColumn}:${filterOptions[sortColumn].sortType}`;
  }

  return {
    page,
    pageSize,
    sort,
    ...filterObject,
  };
};

/**
 * Merges URL search parameters with filter options to create a combined set of conditions.
 * It extracts query parameters and updates the filter options accordingly, including filtering values,
 * sorting, and pagination settings.
 *
 * @param {FilterOptions} options - The initial filter options to be updated.
 * @param {ReadonlyURLSearchParams} searchParams - The URL search parameters containing query data.
 * @returns {FilterOptions} - The updated filter options with merged conditions.
 */
export const mergeConditions = (
  options: FilterOptions,
  searchParams: ReadonlyURLSearchParams,
  pageSizeOption = PAGE_SIZE_OPTIONS
): FilterOptions => {
  const newOptions = cloneDeep(options);
  if (searchParams.toString() === "") {
    return newOptions;
  }

  const keys = Object.keys(newOptions);
  keys.forEach((key) => {
    newOptions[key].filters.forEach((filterItem) => {
      const queryValue = ensureString(searchParams.get(filterItem.name)).trim();
      switch (filterItem.type) {
        case "checkbox": {
          const values = queryValue.split(",");
          (filterItem.value as CheckboxItem[]).forEach((item) => {
            item.checked = values.includes(item.value);
          });
          break;
        }
        case "number": {
          if (isNumeric(queryValue)) {
            filterItem.value = Number(queryValue);
          } else {
            filterItem.value = "";
          }
          break;
        }
        case "date": {
          const momentDate = moment(queryValue);
          if (momentDate.isValid()) {
            filterItem.value = momentDate.toDate();
          } else {
            filterItem.value = "";
          }
          break;
        }
        case "combobox":
        case "select": {
          if (queryValue !== "") {
            /* const option = JSON.parse(queryValue);
            const decryptParam = decryptId(option.value);
            const value = decryptParam ? ensureString(decryptParam) : option.value;
            filterItem.optionSelected = { value: value, label: option.label }; */
            const [decryptedId, label] = queryValue.split(":");
            const value = ensureString(decryptId(decryptedId) || queryValue);
            filterItem.value = value;
            filterItem.optionSelected = { value, label };
          }
          break;
        }
        case "dropdown": {
          const values = queryValue.split(",");
          filterItem.value = values;
          break;
        }
        case "text":
        default:
          filterItem.value = queryValue;
      }
    });
  });

  // Merge sort
  if (searchParams.has("sort")) {
    const [sortColumn, sortType] = ensureString(searchParams.get("sort")).split(":");
    if (sortColumn && sortType && keys.includes(sortColumn)) {
      newOptions[sortColumn].sortType = sortType as SortType;
    }
  } else {
    keys.forEach((key) => {
      newOptions[key].sortType = undefined;
    });
  }

  // Merge page
  if (searchParams.has("page")) {
    newOptions.pagination.page = Number(searchParams.get("page")) || 1;
  }

  // Merge page size
  if (searchParams.has("pageSize")) {
    const pageSize = Number(searchParams.get("pageSize"));
    if (pageSizeOption.includes(pageSize)) {
      newOptions.pagination.pageSize = pageSize;
    } else {
      newOptions.pagination.pageSize = pageSizeOption[0];
    }
  }

  return newOptions;
};

/**
 * Generates a query string from filter options, including filtering values,
 * sorting criteria, and pagination settings. It creates a URL query string that can be
 * used for filtering and displaying data.
 *
 * @param {FilterOptions} options - The filter options containing filtering, sorting, and pagination data.
 * @returns {string} - The generated URL query string.
 */
export const getQueryString = (options: FilterOptions) => {
  const filterProperties = getFilterProperties(options);
  const searchParams = new URLSearchParams();
  filterProperties.forEach((item) => {
    switch (item.type) {
      case "checkbox": {
        const values = (item.value as CheckboxItem[])
          .filter(({ checked }) => checked)
          .map(({ value }) => value)
          .join(",");
        searchParams.append(item.name, values);
        break;
      }
      case "date": {
        searchParams.append(item.name, formatDate(item.value as Date, "YYYY-MM-DD"));
        break;
      }
      case "select":
      case "combobox": {
        const option = item.optionSelected;
        if (option) {
          const encryptOrOriginalValue = isNumeric(option?.value) ? encryptId(Number(option?.value)) : option?.value;
          searchParams.append(item.name, `${encryptOrOriginalValue}:${option.label}`);
        }
        break;
      }
      case "dropdown": {
        const values = (item.value as string[]).join(",");
        searchParams.append(item.name, values);
        break;
      }
      default:
        searchParams.append(item.name, ensureString(item.value));
    }
  });

  // Update query for sorting
  const sortColumn = Object.keys(options).find((key) => options[key].sortType);
  if (sortColumn) {
    searchParams.append("sort", `${sortColumn}:${options[sortColumn].sortType}`);
  }

  // Update query for pagination
  const { page, pageSize } = options.pagination;
  searchParams.append("page", String(page));
  searchParams.append("pageSize", String(pageSize));

  // Automatically include a question mark
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

/**
 * Determines the action placement based on the current index and the total page count.
 *
 * @param {number} currentIndex - The current index in the pagination.
 * @param {number} pageCount - The total number of pages.
 * @returns {string} - Returns "start" if the current index is either the last or second last page and the page count is 3 or more, otherwise returns "end".
 */
export const getActionPlacement = (currentIndex: number, pageCount: number) => {
  return pageCount >= 3 && (pageCount - 1 === currentIndex || pageCount - 2 === currentIndex) ? "start" : "end";
};
