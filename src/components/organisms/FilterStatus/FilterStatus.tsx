"use client";

import clsx from "clsx";
import cloneDeep from "lodash/cloneDeep";
import moment from "moment";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useMemo } from "react";

import { Badge } from "@/components/atoms";
import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import { FilterOptions, FilterProperty } from "@/types/filter";
import { getFilterProperties } from "@/utils/filter";
import { formatNumber } from "@/utils/number";
import { ensureString } from "@/utils/string";

export type FilterStatusProps = {
  options: FilterOptions;
  onChange?: (_options: FilterOptions) => void;
  className?: string;
};

const FilterStatus = ({ options, className, onChange }: FilterStatusProps) => {
  const t = useTranslations();

  const sortColumn = useMemo(() => Object.keys(options).find((key) => options[key].sortType), [options]);
  const filterProperties = useMemo(() => getFilterProperties(options), [options]);

  /**
   * Callback function for removing the sorting order from a specific column's filters.
   */
  const handleRemoveSort = useCallback(() => {
    if (sortColumn) {
      const newOptions = cloneDeep(options);
      newOptions[sortColumn].sortType = undefined;
      onChange && onChange(newOptions);
    }
  }, [onChange, options, sortColumn]);

  /**
   * Callback function for removing a specific filter property from a column's filters and resetting sort type.
   *
   * @param property - The filter property to remove.
   */
  const handleRemoveFilter = useCallback(
    (propertyName: string) => () => {
      const newOptions = cloneDeep(options);
      for (const columnName in newOptions) {
        const option = newOptions[columnName];
        for (let i = 0; i < option.filters.length; i++) {
          const filterItem = option.filters[i];
          if (filterItem.name === propertyName) {
            switch (filterItem.type) {
              case "checkbox":
                filterItem.value = (filterItem.value as CheckboxItem[]).map((item) => ({
                  ...item,
                  checked: false,
                }));
                break;
              case "combobox":
                filterItem.value = "";
                filterItem.optionSelected = undefined;
                break;

              default:
                filterItem.value = "";
                break;
            }
          }
        }
      }
      onChange && onChange(newOptions);
    },
    [onChange, options]
  );

  /**
   * Callback function to display a formatted value based on the selected value.
   * It finds the selected item from the 'items' array and constructs a display value
   * with a label and an optional sub-label.
   *
   * @param {FilterProperty} item - The selected value for which to generate a display value.
   * @returns {string} The formatted display value.
   */
  const displayLabelCombobox = useCallback((item: FilterProperty) => {
    const label = item.optionSelected?.label;
    const subLabel = item.optionSelected?.subLabel;
    if (item?.hideSelectedSubLabel) {
      return ensureString(item.optionSelected?.label);
    } else {
      return subLabel ? ensureString(`${label} (${subLabel})`) : ensureString(label);
    }
  }, []);

  return (
    <div
      className={clsx("flex flex-wrap gap-3", className, {
        "mt-4": sortColumn || filterProperties.length > 0,
      })}
    >
      {sortColumn && (
        <Badge
          color="success"
          title={t("components.filter_status.sort")}
          label={t(options[sortColumn].sortLabel)}
          sort={options[sortColumn].sortType}
          onRemove={handleRemoveSort}
        />
      )}
      {filterProperties.map((item) => (
        <Fragment key={item.name}>
          {/* Checkbox */}
          {item.type === "checkbox" && (
            <Badge
              color="success"
              title={t(item.filterLabel || item.label || item.name)}
              label={((item.value || []) as CheckboxItem[])
                .filter((item) => item.checked)
                .map((item) => item.label && t(item.label))
                .join(", ")}
              onRemove={handleRemoveFilter(item.name)}
            />
          )}

          {/* Date */}
          {item.type === "date" && (
            <Badge
              color="success"
              title={t(item.filterLabel || item.label || item.name)}
              label={moment(item.value as Date).format(t("common.format.date"))}
              onRemove={handleRemoveFilter(item.name)}
              isDelete={item.isShowBtnDelete}
            />
          )}

          {/* Text / Number */}
          {(item.type === "text" || item.type === "number") && (
            <Badge
              color="success"
              title={t(item.filterLabel || item.label || item.name)}
              label={item.type === "number" ? formatNumber(Number(item.value)) : ensureString(item.value)}
              onRemove={handleRemoveFilter(item.name)}
            />
          )}

          {item.type === "combobox" && (
            <Badge
              color="success"
              title={t(item.filterLabel || item.label || item.name)}
              label={displayLabelCombobox(item)}
              onRemove={handleRemoveFilter(item.name)}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default FilterStatus;
