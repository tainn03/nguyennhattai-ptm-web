"use client";

import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { Fragment, useCallback, useMemo } from "react";

export type SelectItem = {
  value: string;
  label: string;
  subLabel?: string;
  imageSrc?: string;
  disabled?: boolean;
};

export type ExtraFunction = {
  label: string;
  onClick: () => void;
};

export type SelectProps = {
  items: SelectItem[];
  label?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  helperText?: string;
  errorText?: string | boolean;
  placement?: "top" | "bottom";
  disabled?: boolean;
  className?: string;
  itemDisplayType?: "truncate" | "wrap";
  onChange?: (_value: string) => void;
};

const Select = ({
  items,
  label,
  name,
  placeholder,
  value,
  required,
  helperText,
  errorText,
  placement = "bottom",
  disabled,
  className,
  itemDisplayType = "wrap",
  onChange,
}: SelectProps) => {
  const selectedItem = useMemo(() => items.find((item: SelectItem) => item.value === value), [items, value]);

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
    },
    [onChange, value]
  );

  return (
    <Listbox value={value} disabled={disabled} name={name} onChange={handleChange}>
      {({ open }) => (
        <div className={clsx("relative w-full", className)}>
          {label && (
            <Listbox.Label className="mb-2 block text-sm font-medium leading-6 text-gray-900">
              {label}
              {required && <span className="ml-1 text-red-600">(*)</span>}
            </Listbox.Label>
          )}

          <Listbox.Button
            className={clsx(
              "relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50 sm:text-sm sm:leading-6",
              {
                "ring-gray-300 focus:ring-blue-700": !errorText,
                "ring-red-600 focus:ring-red-600": errorText,
              }
            )}
          >
            <span
              className={clsx("block h-6 truncate", {
                "text-gray-500": !selectedItem,
              })}
            >
              {selectedItem ? (
                <>
                  {selectedItem.label}
                  {selectedItem.subLabel && ` (${selectedItem.subLabel})`}
                </>
              ) : (
                placeholder
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            show={open}
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              as="div"
              className={clsx(
                "absolute z-10 mt-1 w-full divide-y divide-gray-200 rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm",
                {
                  "bottom-10": placement === "top",
                }
              )}
            >
              <ul className="max-h-60 overflow-auto py-1">
                {items.map((item) => (
                  <Listbox.Option
                    key={item.value}
                    className={({ active }) =>
                      clsx("relative cursor-default select-none py-2 pl-3 pr-9", {
                        "bg-blue-700 text-white": active,
                        "text-gray-900": !active,
                        "cursor-not-allowed bg-gray-50 opacity-50": item.disabled,
                      })
                    }
                    value={item.value}
                    disabled={item.disabled}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex items-center space-x-2">
                          {item.imageSrc && (
                            <img src={item.imageSrc} alt="" className="h-6 w-6 flex-shrink-0 rounded-full" />
                          )}

                          <span
                            className={clsx("block", {
                              truncate: itemDisplayType === "truncate",
                              "font-semibold": selected,
                              "font-normal": !selected,
                              "text-white": active,
                              "text-blue-700": selected && !active,
                            })}
                          >
                            {item.label}

                            {item.subLabel && (
                              <span
                                className={clsx("ml-2 text-sm", {
                                  "text-white": active,
                                  "text-gray-600": !selected && !active,
                                  "text-blue-700": selected && !active,
                                })}
                              >
                                ({item.subLabel})
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
                  </Listbox.Option>
                ))}
              </ul>
            </Listbox.Options>
          </Transition>

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
        </div>
      )}
    </Listbox>
  );
};

export default Select;
