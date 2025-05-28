"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiChevronDown } from "react-icons/hi";

import { cn } from "@/utils/twcn";

export type AutocompleteItem = {
  label: string;
  value: string | number;
};

type AutocompleteProps = {
  items: AutocompleteItem[];
  value?: string;
  placeholder?: string;
  placement?: "top" | "bottom";
  label?: string;
  errorText?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showArrow?: boolean;
  itemDisplayType?: "truncate" | "wrap";
  onChange?: (value: string) => void;
  onSelect?: (item: AutocompleteItem) => void;
};

export default function Autocomplete({
  items,
  value = "",
  placeholder,
  placement = "bottom",
  label,
  errorText,
  helperText,
  required,
  disabled,
  className,
  onChange,
  onSelect,
  showArrow = true,
  itemDisplayType = "wrap",
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredItems = items.filter((item) => item.label.toLowerCase().includes(inputValue.toLowerCase()));

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange?.(newValue);
      setIsOpen(true);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (item: AutocompleteItem) => () => {
      setInputValue(item.label);
      onChange?.(item.label);
      onSelect?.(item);
      setIsOpen(false);
    },
    [onChange, onSelect]
  );

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-600">(*)</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
            {
              "ring-gray-300 focus:ring-blue-700": !errorText,
              "ring-red-300 focus:ring-red-500": errorText,
            }
          )}
        />
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 focus:outline-none disabled:cursor-not-allowed"
        >
          {showArrow && <HiChevronDown className={cn("h-5 w-5", { "rotate-180": isOpen })} />}
        </button>
      </div>

      {isOpen && filteredItems.length > 0 && (
        <div
          className={cn(
            "absolute z-[99] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm",
            {
              "bottom-[130%]": placement === "top",
            }
          )}
        >
          {filteredItems.map((item) => (
            <div
              key={item.value}
              className={cn("relative cursor-pointer select-none px-3 py-2 text-gray-900 hover:bg-gray-100", {
                "bg-gray-100": inputValue === item.label,
                truncate: itemDisplayType === "truncate",
                "whitespace-normal": itemDisplayType === "wrap",
                "font-semibold": inputValue === item.label,
              })}
              onClick={handleSelect(item)}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      {(helperText || errorText) && (
        <p
          className={cn("mt-2 text-sm", {
            "text-gray-500": helperText && !errorText,
            "text-red-600": errorText,
          })}
        >
          {errorText || helperText}
        </p>
      )}
    </div>
  );
}
