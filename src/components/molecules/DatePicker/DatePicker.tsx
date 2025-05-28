"use client";

import "react-datepicker/dist/react-datepicker.css";

import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { enUS, ja, vi } from "date-fns/locale";
import React, { useCallback, useEffect, useState } from "react";
import ReactDatePicker, { ReactDatePickerProps, registerLocale } from "react-datepicker";
import InputMask, { Props as InputMaskProps } from "react-input-mask";

import { useAppState } from "@/redux/states";
import { AnyObject } from "@/types";

const languageType: AnyObject = {
  vi: vi,
  en: enUS,
  ja: ja,
};

export type DatePickerProps = Pick<InputMaskProps, "maskChar" | "alwaysShowMask" | "placeholder"> &
  ReactDatePickerProps & {
    id?: string;
    label?: string;
    mask?: string;
    allowInput?: boolean;
    helperText?: string;
    errorText?: string | boolean;
  };

type MaskedInputProps = {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLInputElement>) => void;
};

const DatePicker = ({
  id,
  name,
  label,
  dateFormat = "dd/MM/yyyy",
  mask = "99/99/9999",
  maskChar,
  alwaysShowMask = true,
  allowInput = true,
  placeholder,
  required,
  disabled,
  errorText,
  helperText,
  showIcon = true,
  className,
  locale = "vi",
  onChangeRaw,
  ...otherProps
}: DatePickerProps) => {
  const { userProfile } = useAppState();

  const [localeState, setLocaleState] = useState(locale);

  useEffect(() => {
    const locale = userProfile?.setting.locale;
    if (locale) {
      registerLocale(locale, languageType[locale]);
      setLocaleState(locale);
    }
  }, [userProfile?.setting.locale]);

  /**
   * Handle input focus for a date input field.
   *
   * @param {React.FocusEvent<HTMLInputElement>} event - The focus event object.
   */
  const handleInputChange = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const value = event.target.value;
      let isValid = true;
      if (typeof dateFormat === "string") {
        isValid = dateFormat.toUpperCase().replace(/[A-Z]/g, "_") !== value;
      } else {
        isValid = dateFormat.every((format) => format.toUpperCase().replace(/[A-Z]/g, "_") !== value);
      }

      if (!isValid) {
        otherProps.onChange(null, undefined);
      }

      onChangeRaw && onChangeRaw(event);
    },
    [dateFormat, onChangeRaw, otherProps]
  );

  const MaskedInput = React.forwardRef(({ value, onChange, onClick }: MaskedInputProps, ref) => (
    <>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-900">
          {label}
          {required && <span className="ml-1 text-red-600">(*)</span>}
        </label>
      )}
      <div
        className={clsx({
          relative: showIcon,
          "mt-2": label,
        })}
      >
        <InputMask
          ref={ref as React.ForwardedRef<InputMask>}
          id={id}
          name={name}
          value={value}
          mask={mask}
          maskChar={maskChar}
          readOnly={!allowInput}
          alwaysShowMask={placeholder ? false : alwaysShowMask}
          placeholder={placeholder}
          disabled={disabled}
          onClick={!showIcon ? onClick : undefined}
          onChange={onChange}
          className={clsx(
            "block w-full rounded-md border-0 py-1.5 text-sm font-normal leading-6 ring-1 ring-inset focus:ring-2 focus:ring-inset",
            {
              "pr-10": showIcon,
              "text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-blue-700": !errorText,
              "text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500": errorText,
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200": disabled,
            }
          )}
        />

        {/* Show calendar icon */}
        {showIcon && (
          <button
            type="button"
            onClick={disabled ? undefined : onClick}
            className={clsx("absolute right-3 top-1.5", {
              "cursor-not-allowed": disabled,
            })}
          >
            <CalendarDaysIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
          </button>
        )}

        {/* Error text and helper text */}
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
    </>
  ));

  MaskedInput.displayName = "MaskedInput";

  return (
    <div className={clsx(className, "date-picker")}>
      <ReactDatePicker
        popperClassName={clsx({
          // In case date picker
          "[&>div>div>*:last-child>:first-child>:first-child]:!hidden [&>div>div>*:last-child>:first-child>:nth-child(2)_span]:!top-0.5 [&>div>div>*:last-child>:first-child>:nth-child(2)>div>:first-child_span]:!font-semibold":
            !otherProps.showTimeSelect,
          // In case date time picker
          "[&>div>div>*:nth-child(5)>:first-child>:first-child]:!hidden [&>div>div>*:nth-child(5)>:first-child>:nth-child(2)_span]:!top-0.5 [&>div>div>*:nth-child(5)>:first-child>:nth-child(2)>div>:first-child_span]:!font-semibold [&>div>div>*:nth-child(6)>:nth-child(2)>div]:!border-r  [&>div>div>*:nth-child(6)>:nth-child(2)>div]:!border-gray-400":
            otherProps.showTimeSelect,
        })}
        customInput={<MaskedInput />}
        showMonthDropdown
        scrollableYearDropdown
        showYearDropdown
        yearDropdownItemNumber={100}
        dateFormat={dateFormat}
        locale={localeState}
        {...otherProps}
        onChangeRaw={handleInputChange}
      />
    </div>
  );
};

export default DatePicker;
