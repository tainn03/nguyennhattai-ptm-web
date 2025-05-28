"use client";

import clsx from "clsx";
import { InputHTMLAttributes, ReactNode, useEffect, useState } from "react";

import { randomString } from "@/utils/string";

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  disabled?: boolean;
  subLabel?: string;
  isHtmlFor?: boolean;
  direction?: "auto" | "column" | "row";
};

const Checkbox = ({
  id,
  label,
  disabled = false,
  subLabel,
  isHtmlFor = true,
  className,
  direction = "column",
  ...otherProps
}: CheckboxProps) => {
  const [checkboxId, setCheckboxId] = useState(id);

  useEffect(() => {
    if (!id) {
      setCheckboxId(`checkbox_${randomString(10)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={clsx("relative flex items-start", className)}>
      <div className="flex h-6 items-center">
        <input
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          className={clsx("h-4 w-4 rounded border-gray-300", {
            "text-blue-700 focus:ring-blue-700": !disabled,
            "text-gray-300 focus:ring-gray-300": disabled,
          })}
          {...otherProps}
        />
      </div>
      {subLabel ? (
        <div className="ml-3 text-sm leading-6">
          <label htmlFor={isHtmlFor ? checkboxId : ""} className="font-medium text-gray-900">
            {label}
          </label>
          {direction === "column" ? (
            <p id={`${checkboxId}-description`} className="text-gray-500">
              {subLabel}
            </p>
          ) : (
            <span id={`${checkboxId}-description`} className="ml-2 text-gray-500">
              {subLabel}
            </span>
          )}
        </div>
      ) : (
        <label htmlFor={isHtmlFor ? checkboxId : ""} className="ml-3 block text-sm font-medium leading-6 text-gray-900">
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
