"use client";

import { Combobox as TailwindCombobox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";

import { Avatar } from "@/components/molecules";
import { PATTERN_SPECIAL_CHARACTERS } from "@/constants/regexp";

export type ComboboxItem = {
  value: string;
  label: string;
  subLabel?: string;
  imageSrc?: string;
  disabled?: boolean;
};

export type ComboboxProps = {
  items: ComboboxItem[];
  label?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  errorText?: string | boolean;
  showAvatar?: boolean;
  loading?: boolean;
  newButtonText?: string;
  onNewButtonClick?: () => void;
  manageButtonText?: string;
  onManageButtonClick?: () => void;
  onChange?: (value: string) => void;
  className?: string;
  placement?: "top" | "bottom";
  itemDisplayType?: "truncate" | "wrap";
  emptyLabel?: string;
  hideSelectedSubLabel?: boolean;
};

const Combobox = ({
  items,
  label,
  placeholder,
  value,
  required,
  disabled,
  helperText,
  errorText,
  showAvatar,
  loading,
  className,
  newButtonText,
  onNewButtonClick,
  manageButtonText,
  onManageButtonClick,
  onChange,
  placement = "bottom",
  itemDisplayType = "wrap",
  emptyLabel,
  hideSelectedSubLabel,
}: ComboboxProps) => {
  const t = useTranslations("components.combobox");
  const [query, setQuery] = useState("");

  /**
   * Memoized computation of filtered data based on the search query.
   * If a query is provided, it filters the 'items' array based on the query using a case-insensitive regular expression.
   * If no query is provided, it returns the original 'items' array.
   *
   * @returns {Array} An array of items matching the search query or the original 'items' array.
   */
  const filteredData = useMemo(() => {
    if (query) {
      const escapedQuery = query.trim().replace(PATTERN_SPECIAL_CHARACTERS, "\\$&");

      const result: ComboboxItem[] = [];
      items.map((item) => {
        const regex = new RegExp(escapedQuery, "gi");

        const combinedLabel = item.subLabel ? `${item.label} (${item.subLabel})` : item.label; // Normalize subLabel
        const normalizeLabel = combinedLabel
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Exceed diacritics
          .replace(/Đ/g, "D") // Replace Đ
          .replace(/đ/g, "d"); // Replace đ

        if (regex.test(combinedLabel) || regex.test(normalizeLabel)) {
          result.push(item);
        }
      });
      return result;
    }
    return items;
  }, [items, query]);

  /**
   * Callback function to handle changes in the selected value.
   *
   * @param {string} selectedValue - The newly selected value.
   */
  const handleChange = useCallback(
    (selectedValue: string) => {
      if (selectedValue !== value) {
        onChange && onChange(selectedValue);
      }
      setQuery("");
    },
    [onChange, value]
  );

  const handleBlur = useCallback(() => {
    if (!filteredData.length) {
      setQuery("");
    }
  }, [filteredData]);

  /**
   * Callback function to display a formatted value based on the selected value.
   * It finds the selected item from the 'items' array and constructs a display value
   * with a label and an optional sub-label.
   *
   * @param {string} selectedValue - The selected value for which to generate a display value.
   * @returns {string} The formatted display value.
   */
  const displayValue = useCallback(
    (selectedValue: string) => {
      const selectedItem = items.find((item) => item.value === selectedValue);
      if (selectedItem) {
        const { label, subLabel } = selectedItem;
        if (hideSelectedSubLabel) {
          return label;
        } else {
          return subLabel ? `${label} (${subLabel})` : label;
        }
      }
      return "";
    },
    [hideSelectedSubLabel, items]
  );

  return (
    <TailwindCombobox
      as="div"
      value={value}
      disabled={disabled}
      onChange={handleChange}
      className={clsx("w-full", className)}
    >
      {label && (
        <TailwindCombobox.Label className="block text-sm font-medium leading-6 text-gray-900">
          {label}
          {required && <span className="text-red-600"> (*)</span>}
        </TailwindCombobox.Label>
      )}
      <div
        className={clsx("relative", {
          "mt-2": label,
        })}
      >
        <TailwindCombobox.Input
          onBlur={handleBlur}
          className={clsx(
            "w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-sm leading-6 text-gray-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50",
            {
              "ring-gray-300 focus:ring-blue-700": !errorText,
              "ring-red-300 focus:ring-red-300": errorText,
            }
          )}
          onChange={(event) => setQuery(event.target.value)}
          displayValue={displayValue}
          placeholder={(loading && "Đang tải...") || placeholder}
        />
        <TailwindCombobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </TailwindCombobox.Button>

        <TailwindCombobox.Options
          as="div"
          className={clsx(
            "absolute z-40 mt-1 w-full divide-y divide-gray-200 rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm",
            {
              "bottom-10": placement === "top",
            }
          )}
        >
          <ul className="max-h-60 overflow-auto py-1 text-sm">
            {filteredData.length === 0 && (
              <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900">
                <span className="truncate text-sm text-gray-500">{t("no_data_found")}</span>
              </li>
            )}
            {emptyLabel && filteredData.length !== 0 && (
              <TailwindCombobox.Option
                value={null}
                className={({ active }) =>
                  clsx("relative cursor-default select-none py-2 pl-3 pr-9", {
                    "bg-blue-700 text-white": active,
                    "text-gray-900": !active,
                  })
                }
              >
                {({ active, selected }) => (
                  <>
                    <div className="flex items-center space-x-2">
                      <span
                        className={clsx("truncate", {
                          "font-semibold": selected,
                        })}
                      >
                        {emptyLabel ? emptyLabel : t("empty_label")}
                      </span>
                    </div>

                    {selected && (
                      <span
                        className={clsx("absolute inset-y-0 right-0 flex items-center pr-4", {
                          "text-white": active,
                          "text-blue-700": !active,
                        })}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </TailwindCombobox.Option>
            )}

            {filteredData.map((data) => (
              <TailwindCombobox.Option
                key={data.value}
                value={data.value}
                disabled={data.disabled}
                className={({ active }) =>
                  clsx("relative cursor-default select-none py-2 pl-3 pr-9", {
                    "bg-blue-700 text-white": active,
                    "text-gray-900": !active,
                    "bg-gray-50 opacity-50": data.disabled,
                  })
                }
              >
                {({ active, selected }) => (
                  <>
                    <div className="flex items-center space-x-2">
                      {showAvatar && <Avatar size="small" displayName={data.label} avatarURL={data.imageSrc} />}
                      <span
                        className={clsx({
                          truncate: itemDisplayType === "truncate",
                          "font-semibold": selected,
                          "font-normal": !selected,
                          "text-white": active,
                          "text-blue-700": selected && !active,
                        })}
                      >
                        {data.label}

                        {data.subLabel && (
                          <span
                            className={clsx("ml-2 text-sm", {
                              "text-white": active,
                              "text-gray-600": !selected && !active,
                              "text-blue-700": selected && !active,
                            })}
                          >
                            ({data.subLabel})
                          </span>
                        )}
                      </span>
                    </div>

                    {selected && (
                      <span
                        className={clsx("absolute inset-y-0 right-0 flex items-center pr-4", {
                          "text-white": active,
                          "text-blue-700": !active,
                        })}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </TailwindCombobox.Option>
            ))}
          </ul>

          {(newButtonText || manageButtonText) && (
            <ul className="py-1">
              {newButtonText && (
                <li
                  className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-blue-700 hover:text-white"
                  onClick={onNewButtonClick}
                >
                  <span className="truncate">{newButtonText}</span>
                </li>
              )}
              {manageButtonText && (
                <li
                  className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-blue-700 hover:text-white"
                  onClick={onManageButtonClick}
                >
                  <span className="truncate">{manageButtonText}</span>
                </li>
              )}
            </ul>
          )}
        </TailwindCombobox.Options>
      </div>

      {(errorText || helperText) && (
        <p
          className={clsx("mt-2 block text-xs", {
            "text-red-600": errorText,
            "text-gray-500": !errorText,
          })}
        >
          {errorText || helperText}
        </p>
      )}
    </TailwindCombobox>
  );
};

export default Combobox;
