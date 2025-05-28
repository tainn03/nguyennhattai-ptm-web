"use client";

import clsx from "clsx";
import { InputHTMLAttributes, useEffect, useState } from "react";

import { randomString } from "@/utils/string";

export type RadioProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  subLabel?: string;
  direction?: "auto" | "column" | "row";
};

const Radio = ({ id, label, subLabel, className, direction = "column", ...otherProps }: RadioProps) => {
  const [radioId, setRadioId] = useState(id);

  useEffect(() => {
    if (!id) {
      setRadioId(`radio_${randomString(10)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex items-start">
      <div className={clsx("flex h-6 items-center", className)}>
        <input
          id={radioId}
          type="radio"
          className="h-4 w-4 border-gray-300 text-blue-700 focus:ring-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          {...otherProps}
        />
      </div>
      {subLabel ? (
        <div className="ml-3 text-sm leading-6">
          <label htmlFor={radioId} className="font-medium text-gray-900">
            {label}
          </label>
          {direction === "column" ? (
            <p id={`${radioId}-description`} className="text-gray-500">
              {subLabel}
            </p>
          ) : (
            <span id={`${radioId}-description`} className="ml-2 text-gray-500">
              {subLabel}
            </span>
          )}
        </div>
      ) : (
        <label htmlFor={radioId} className="ml-3 block whitespace-nowrap text-sm font-medium leading-6 text-gray-900">
          {label}
        </label>
      )}
    </div>
  );
};

export default Radio;
