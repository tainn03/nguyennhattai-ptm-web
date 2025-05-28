import { DynamicAnalysisFilterDataType } from "@prisma/client";
import endOfDay from "date-fns/endOfDay";
import endOfMonth from "date-fns/endOfMonth";
import endOfWeek from "date-fns/endOfWeek";
import endOfYear from "date-fns/endOfYear";
import startOfDay from "date-fns/startOfDay";
import startOfMonth from "date-fns/startOfMonth";
import startOfWeek from "date-fns/startOfWeek";
import startOfYear from "date-fns/startOfYear";
import { FormikHelpers, useFormik } from "formik";
import isArray from "lodash/isArray";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LiaSearchSolid as LiaSearchSolidIcon } from "react-icons/lia";

import { getDynamicAnalysisFiltersById } from "@/actions/dynamicAnalysis";
import { Button, CheckboxGroup, Combobox, DatePicker, NumberField, TextField } from "@/components/molecules";
import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { AnyObject } from "@/types";
import { DynamicAnalysisFilterInfo } from "@/types/strapi";
import { isValidDate, parseDate } from "@/utils/date";
import { isNumeric } from "@/utils/number";
import { ensureString, isTrue } from "@/utils/string";
import { cn } from "@/utils/twcn";

const DEFAULT_DATE_RANGES: Record<string, Date> = {
  today: new Date(),
  startOfWeek: startOfWeek(new Date()),
  endOfWeek: endOfWeek(new Date()),
  startOfMonth: startOfMonth(new Date()),
  endOfMonth: endOfMonth(new Date()),
  startOfYear: startOfYear(new Date()),
  endOfYear: endOfYear(new Date()),
  startOfDay: startOfDay(new Date()),
  endOfDay: endOfDay(new Date()),
};

type DynamicAnalysisFiltersProps = {
  loading: boolean;
  originId: number;
  onSearch: (values: Record<string, AnyObject | Date | string | number | null>) => void;
};

const DynamicAnalysisFilters = ({ loading, originId, onSearch }: DynamicAnalysisFiltersProps) => {
  const t = useTranslations();
  const [dynamicAnalysisFilters, setDynamicAnalysisFilters] = useState<Partial<DynamicAnalysisFilterInfo>[]>([]);

  /**
   * Default checkbox options for boolean data types in dynamic analysis filters.
   */
  const DEFAULT_CHECKBOX_OPTIONS: CheckboxItem[] = useMemo(
    () => [
      { label: t("dynamic_report.dynamic_analysis_filter.data_type.boolean.true"), value: "true" },
      { label: t("dynamic_report.dynamic_analysis_filter.data_type.boolean.false"), value: "false" },
    ],
    [t]
  );

  /**
   * Retrieves the default date value for a filter based on its `defaultValue` property.
   *
   * @param {Partial<DynamicAnalysisFilterInfo>} param0 - An object containing an optional `defaultValue` property.
   * @returns {Date | null} - The default date range value if `defaultValue` exists; otherwise, null.
   */
  const getDateDefaultValue = useCallback(
    ({ defaultValue }: Partial<DynamicAnalysisFilterInfo>) => (defaultValue ? DEFAULT_DATE_RANGES[defaultValue] : null),
    []
  );

  /**
   * Retrieves the default checkbox values for a filter based on its `defaultValue` property.
   *
   * @param {Partial<DynamicAnalysisFilterInfo>} param0 - An object containing an optional `defaultValue` property.
   * @returns {Array} - An array of checkbox options, marking one as checked if its value matches `defaultValue`.
   */
  const getCheckboxDefaultValue = useCallback(
    ({ defaultValue }: Partial<DynamicAnalysisFilterInfo>) =>
      defaultValue
        ? DEFAULT_CHECKBOX_OPTIONS.map((option) => ({
            ...option,
            checked: option.value === defaultValue,
          }))
        : DEFAULT_CHECKBOX_OPTIONS,
    [DEFAULT_CHECKBOX_OPTIONS]
  );

  /**
   * Transforms the form values to a format suitable for sending to the API.
   *
   * @param {Record<string, AnyObject | Date | string | number | null>} values - The form values to transform.
   * @returns {Record<string, AnyObject | Date | string | number | null>} - The transformed form values.
   */
  const transformReportValues = useCallback((values: Record<string, AnyObject | Date | string | number | null>) => {
    const filteredReportValues: Record<string, AnyObject | Date | string | number | null> = {};
    for (const key in values) {
      if (isArray(values[key])) {
        filteredReportValues[key] = (values[key] as CheckboxItem[])
          .filter((item) => isTrue(item.checked))
          .map((item) => item.value)
          .join(",");
      } else {
        filteredReportValues[key] = values[key];
      }
    }
    return filteredReportValues;
  }, []);

  /**
   * Handles form submission for a Formik form, invoking a search function with the form values.
   *
   * @param {Record<string, AnyObject | Date | string | number | null>} values - The form values submitted by the user.
   * @param {FormikHelpers<Record<string, AnyObject | Date | string | number | null>>} formikHelpers - An object providing helper functions for managing form state.
   */
  const handleSubmitFormik = useCallback(
    (
      values: Record<string, AnyObject | Date | string | number | null>,
      formikHelpers: FormikHelpers<Record<string, AnyObject | Date | string | number | null>>
    ) => {
      onSearch(transformReportValues(values));
      formikHelpers.setSubmitting(false);
    },
    [onSearch, transformReportValues]
  );

  const { values, handleSubmit, setFieldValue } = useFormik({
    initialValues: {} as Record<string, AnyObject | Date | string | number | null>,
    onSubmit: handleSubmitFormik,
  });

  useEffect(() => {
    /**
     * Asynchronously fetches dynamic analysis filters by the provided origin ID and sets their default values.
     */
    const fetchDynamicAnalysisFilters = async () => {
      // Fetch dynamic analysis filters based on the origin ID.
      const dynamicAnalysis = await getDynamicAnalysisFiltersById(originId);
      let initialFilters: Record<string, AnyObject | Date | string | number | null> = {};

      if (dynamicAnalysis.filters) {
        // Iterate over each filter in the fetched dynamic analysis data.
        for (const filter of dynamicAnalysis.filters) {
          const { id, key, dataType, defaultValue } = filter;
          // Use `key` if available, otherwise fallback to a stringified `id`.
          const keyProp = key ?? ensureString(id);

          // Handle setting field values based on filter data type.
          switch (dataType) {
            case DynamicAnalysisFilterDataType.BOOLEAN: {
              const checkboxDefaultValue = getCheckboxDefaultValue(filter);
              // Set the value using checkbox default settings.
              setFieldValue(keyProp, checkboxDefaultValue);
              initialFilters = { ...initialFilters, [keyProp]: checkboxDefaultValue };
              break;
            }
            case DynamicAnalysisFilterDataType.CHOICE:
              break;
            case DynamicAnalysisFilterDataType.DATE:
            case DynamicAnalysisFilterDataType.DATETIME: {
              const dateDefaultValue = getDateDefaultValue(filter);
              // Set the value using date default settings.
              setFieldValue(keyProp, getDateDefaultValue(filter));
              initialFilters = { ...initialFilters, [keyProp]: dateDefaultValue };
              break;
            }
            case DynamicAnalysisFilterDataType.NUMBER:
              // Set the field value directly from `defaultValue`.
              setFieldValue(keyProp, Number(defaultValue));
              initialFilters = { ...initialFilters, [keyProp]: Number(defaultValue) };
              break;
            case DynamicAnalysisFilterDataType.TEXT:
              // Set the field value directly from `defaultValue`.
              setFieldValue(keyProp, defaultValue);
              initialFilters = { ...initialFilters, [keyProp]: defaultValue as string };
              break;
            default:
              break;
          }
        }
        // Set the fetched filters to state.
        setDynamicAnalysisFilters(dynamicAnalysis.filters || []);
        onSearch(transformReportValues(initialFilters));
      }
    };

    // Call the function to fetch and process filters when the effect runs.
    fetchDynamicAnalysisFilters();
    onSearch(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Retrieves choice items for a combobox based on the `defaultValue` of a filter.
   *
   * @param {Partial<DynamicAnalysisFilterInfo>} param0 - An object containing an optional `defaultValue` property.
   * @returns {ComboboxItem[]} - An array of combobox items, with each item created from a line in the `defaultValue` string.
   */
  const getChoiceItems = useCallback(
    ({ defaultValue }: Partial<DynamicAnalysisFilterInfo>): ComboboxItem[] =>
      defaultValue ? defaultValue.split("\n").map((pair: string) => ({ label: pair, value: pair })) : [],
    []
  );

  /**
   * Handles changes to a dynamic analysis field based on its data type.
   *
   * @param {Partial<DynamicAnalysisFilterInfo>} field - An object representing a dynamic analysis filter with key and data type properties.
   * @returns {Function} - A function that processes the input value based on the filter's data type.
   */
  const handleDynamicAnalysisFieldChange = useCallback(
    (field: Partial<DynamicAnalysisFilterInfo>) => {
      const { key, dataType } = field;
      // Use `key` if available, otherwise fallback to a stringified `id`.
      const keyProp = key ?? ensureString(field.id);

      // Returns a function to handle the input value for the specified field.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (value: any) => {
        switch (dataType) {
          case DynamicAnalysisFilterDataType.BOOLEAN:
          case DynamicAnalysisFilterDataType.CHOICE:
            // Set the field value directly for BOOLEAN and CHOICE data types.
            setFieldValue(keyProp, value);
            break;
          case DynamicAnalysisFilterDataType.DATE:
          case DynamicAnalysisFilterDataType.DATETIME:
            // Set the field value after parsing the date for DATE and DATETIME types.
            setFieldValue(keyProp, value ? parseDate(value) : null);
            break;
          case DynamicAnalysisFilterDataType.NUMBER:
          case DynamicAnalysisFilterDataType.TEXT:
            // Set the field value from the event target's value for NUMBER and TEXT types.
            setFieldValue(keyProp, value.target.value);
            break;
          default:
            break;
        }
      };
    },
    [setFieldValue]
  );

  /**
   * Renders a dynamic analysis filter based on its data type.
   *
   * @param {Partial<DynamicAnalysisFilterInfo>} field - An object representing a dynamic analysis filter with various properties.
   * @returns {JSX.Element|null} - A JSX element representing the appropriate input field or null if no matching type is found.
   */
  const renderDynamicAnalysisFilter = useCallback(
    (field: Partial<DynamicAnalysisFilterInfo>) => {
      const { id, name, key, dataType } = field;
      const strId = ensureString(id); // Ensures `id` is converted to a string.
      const keyProp = key ?? strId; // Use `key` if available, otherwise fallback to `strId`.
      const currentValue = values[keyProp]; // Retrieve the current value from values.

      // Common properties for input components.
      const props = {
        label: name ?? strId,
        name: key ?? strId,
        ...(dataType === DynamicAnalysisFilterDataType.DATETIME && {
          selected: isValidDate(currentValue) ? parseDate(ensureString(currentValue)) : null,
          dateFormat: "dd/MM/yyyy HH:mm",
          mask: "99/99/9999 99:99",
          showTimeSelect: true,
          isClearable: false,
        }),
        ...(dataType === DynamicAnalysisFilterDataType.DATE && {
          selected: isValidDate(currentValue) ? parseDate(ensureString(currentValue)) : null,
          isClearable: false,
        }),
        ...(dataType === DynamicAnalysisFilterDataType.CHOICE && {
          placeholder: t("dynamic_report.dynamic_analysis_filter.choice_placeholder", {
            name: name?.toLowerCase() ?? strId,
          }),
        }),
        ...((dataType === DynamicAnalysisFilterDataType.TEXT || dataType === DynamicAnalysisFilterDataType.NUMBER) && {
          placeholder: t("dynamic_report.dynamic_analysis_filter.text_placeholder", {
            name: name?.toLowerCase() ?? strId,
          }),
        }),
        onChange: handleDynamicAnalysisFieldChange(field),
      };

      // Render the appropriate input component based on data type.
      switch (dataType) {
        case DynamicAnalysisFilterDataType.TEXT:
          return <TextField {...props} value={ensureString(currentValue)} />;
        case DynamicAnalysisFilterDataType.NUMBER:
          return <NumberField {...props} value={isNumeric(currentValue) ? Number(currentValue) : null} />;
        case DynamicAnalysisFilterDataType.DATE:
          return <DatePicker {...props} />;
        case DynamicAnalysisFilterDataType.DATETIME:
          return <DatePicker {...props} />;
        case DynamicAnalysisFilterDataType.BOOLEAN: {
          return <CheckboxGroup {...props} items={currentValue as unknown as CheckboxItem[]} />;
        }
        case DynamicAnalysisFilterDataType.CHOICE:
          return (
            <Combobox {...props} placement="top" items={getChoiceItems(field)} value={ensureString(currentValue)} />
          );
        default:
          return null; // Return null if no matching data type is found.
      }
    },
    [getChoiceItems, handleDynamicAnalysisFieldChange, t, values]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        {dynamicAnalysisFilters.map((field) => (
          <div
            key={`dynamic-analysis-filter-${field.id}`}
            className={cn("col-span-full [&_label]:!whitespace-pre-wrap [&_label]:break-all", {
              "col-span-full": field.size === 6,
              "sm:col-span-5": field.size === 5,
              "sm:col-span-4": field.size === 4,
              "sm:col-span-3": field.size === 3,
              "sm:col-span-2": field.size === 2,
              "sm:col-span-1": field.size === 1,
            })}
          >
            {renderDynamicAnalysisFilter(field)}
          </div>
        ))}
      </div>
      {dynamicAnalysisFilters.length > 0 && (
        <Button className="self-end" icon={LiaSearchSolidIcon} disabled={loading}>
          {t("dynamic_report.search_btn_label")}
        </Button>
      )}
    </form>
  );
};

export default DynamicAnalysisFilters;
