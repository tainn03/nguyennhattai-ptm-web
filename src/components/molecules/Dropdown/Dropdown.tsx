"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { ChangeEvent, memo, MouseEvent, useCallback, useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/atoms";
import { ensureString } from "@/utils/string";

type DropdownProps = {
  options?: Record<string, string | number>[];
  label?: string;
  value?: string[];
  required?: boolean;
  placeholder?: string;
  valueKey?: string;
  labelKey?: string;
  loading?: boolean;
  className?: string;
  errorText?: string;
  helperText?: string;
  onChange?: (value: string[]) => void;
};

const Dropdown = ({
  options,
  label,
  value,
  required,
  placeholder,
  valueKey = "value",
  labelKey = "label",
  loading,
  errorText,
  helperText,
  className,
  onChange,
}: DropdownProps) => {
  const t = useTranslations("components.dropdown");
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<string[]>(value ?? []);
  const [renderKey, setRenderKey] = useState(0);
  const toggleOpen = useCallback(() => !loading && setOpen(!open), [open, loading]);
  const stopPropagation = useCallback((e: MouseEvent<HTMLInputElement>) => e.stopPropagation(), []);

  useEffect(() => {
    selectedRef.current = value ?? [];
    setRenderKey((prev) => prev + 1);
  }, [value]);

  const handleChange = useCallback(
    (value: string) => () => {
      let newSelected = [...selectedRef.current];
      if (newSelected.includes(value)) {
        newSelected = newSelected.filter((item) => item !== value);
      } else {
        newSelected.push(value);
      }
      selectedRef.current = newSelected;
      setRenderKey((prev) => prev + 1);
      onChange?.(newSelected);
    },
    [onChange]
  );

  const handleCheckAll = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newSelected: string[] = [];
      const checkBoxes = document.querySelectorAll<HTMLInputElement>(".dropdown");

      checkBoxes.forEach((checkbox) => {
        checkbox.checked = e.target.checked;
        if (e.target.checked) {
          newSelected.push(checkbox.value);
        }
      });

      selectedRef.current = newSelected;
      setRenderKey((prev) => prev + 1);
      onChange?.(newSelected);
    },
    [onChange]
  );

  useEffect(() => {
    if (selectedRef.current.length !== 0 && selectedRef.current.length === (options ?? []).length) {
      const checkBox = document.querySelector<HTMLInputElement>("#dropdownCheckAll");
      if (checkBox) {
        checkBox.checked = true;
      }
    } else {
      const checkBox = document.querySelector<HTMLInputElement>("#dropdownCheckAll");
      if (checkBox) {
        checkBox.checked = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === "a" || event.key === "d")) {
        handleCheckAll({ target: { checked: event.key === "a" } } as ChangeEvent<HTMLInputElement>);
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCheckAll, open]);

  return (
    <div
      onClick={toggleOpen}
      className={clsx(className, {
        "after:fixed after:bottom-0 after:left-0 after:right-0 after:top-0 after:z-40": open,
      })}
    >
      <div className="relative">
        {label && (
          <label className="mb-2 block text-sm font-medium leading-6 text-gray-900">
            {label}
            {required && <span className="ml-1 text-red-600">(*)</span>}
          </label>
        )}
        <button
          className={clsx(
            "inline-flex min-h-[36px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-1.5 text-center text-sm font-normal text-gray-900 hover:bg-blue-50/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-700",
            {
              "cursor-wait": loading,
            }
          )}
          type="button"
          onClick={toggleOpen}
        >
          {loading
            ? t("loading")
            : selectedRef.current.length === 0
            ? placeholder
            : t("selected", { count: selectedRef.current.length })}
          {loading ? (
            <Spinner className="h-4 w-4 text-blue-600" />
          ) : (
            <ChevronDownIcon
              aria-hidden="true"
              className={clsx("h-4 w-3 text-gray-500 transition-transform duration-300", {
                "rotate-180 transform": open,
              })}
            />
          )}
        </button>
        {!open && (errorText || helperText) && (
          <p
            className={clsx("mt-2 block text-xs", {
              "text-red-600": errorText,
              "text-gray-500": !errorText,
            })}
          >
            {errorText || helperText}
          </p>
        )}

        <div
          onClick={stopPropagation}
          className={clsx("absolute z-50 w-full min-w-[13.75rem] rounded-lg bg-white shadow", {
            hidden: !open,
            block: open,
            "top-10": !label,
            "top-20": label,
          })}
        >
          <ul className="h-48 overflow-y-auto scroll-smooth p-3 text-sm text-gray-700">
            {(options ?? []).map((option) => {
              return (
                <li key={option[valueKey]} className="cursor-pointer">
                  <div className="flex items-center rounded ps-2 transition-all duration-200 hover:bg-gray-100">
                    <input
                      id={`checkbox-item-${option[valueKey]}`}
                      type="checkbox"
                      value={option[valueKey]}
                      onClick={stopPropagation}
                      onChange={handleChange(ensureString(option[valueKey]))}
                      checked={selectedRef.current.includes(ensureString(option[valueKey]))}
                      className="dropdown h-4 w-4 cursor-pointer rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`checkbox-item-${option[valueKey]}`}
                      className="ms-2 w-full cursor-pointer rounded py-2 text-sm font-medium text-gray-900"
                    >
                      {option[labelKey]}
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center rounded-b-lg border-t border-gray-200 bg-gray-50 p-3">
            <input
              key={renderKey}
              id="dropdownCheckAll"
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
              onClick={stopPropagation}
              onChange={handleCheckAll}
            />
            <label
              htmlFor="dropdownCheckAll"
              className="ms-2 w-full cursor-pointer rounded text-sm font-medium text-gray-900"
            >
              {t("select_all")}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Dropdown);
