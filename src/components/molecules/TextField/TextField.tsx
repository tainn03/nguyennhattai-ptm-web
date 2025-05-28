"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { ChangeEvent, ElementType, FocusEvent, InputHTMLAttributes, ReactNode, useMemo } from "react";

import { ensureString } from "@/utils/string";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "onBlur"> & {
  label?: string;
  hintComponent?: ReactNode;
  showCount?: boolean;
  multiline?: boolean;
  rows?: number;
  toolbarComponent?: ReactNode;
  prefixText?: string;
  suffixText?: string;
  icon?: ElementType;
  iconPlacement?: "start" | "end";
  leftAddon?: string;
  rightAddon?: ReactNode;
  rightAddonBorder?: boolean;
  rightAddonClick?: () => void;
  helperText?: string | boolean;
  errorText?: string | boolean;
  resize?: boolean;
  onChange?: (_event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onBlur?: (_event: FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
};

const TextField = ({
  id,
  type,
  required,
  disabled,
  value = "",
  label,
  maxLength,
  hintComponent,
  showCount,
  multiline,
  rows = 3,
  toolbarComponent,
  prefixText,
  suffixText,
  icon: Icon,
  iconPlacement = "start",
  leftAddon,
  rightAddon,
  rightAddonBorder = true,
  rightAddonClick,
  helperText,
  errorText,
  resize = true,
  className,
  onChange,
  onBlur,
  ...otherProps
}: TextFieldProps) => {
  const t = useTranslations();

  const prefixTextComponent = useMemo(
    () =>
      prefixText && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">{prefixText}</span>
        </div>
      ),
    [prefixText]
  );

  const suffixTextComponent = useMemo(
    () =>
      suffixText && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-gray-500 sm:text-sm">{suffixText}</span>
        </div>
      ),
    [suffixText]
  );

  const iconComponent = useMemo(
    () =>
      Icon && (
        <div
          className={clsx("pointer-events-none absolute inset-y-0 flex items-center", {
            "left-0 pl-3": iconPlacement === "start",
            "right-0 pr-3": iconPlacement === "end",
          })}
        >
          <Icon className="h-5 w-5 text-gray-500" aria-hidden="true" />
        </div>
      ),
    [Icon, iconPlacement]
  );

  const leftAddonComponent = useMemo(
    () =>
      leftAddon && (
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 px-3 text-gray-500 sm:text-sm">
          {leftAddon}
        </span>
      ),
    [leftAddon]
  );

  const rightAddonComponent = useMemo(
    () =>
      rightAddon && (
        <button
          type="button"
          onClick={rightAddonClick}
          className={clsx(
            "relative -ml-px inline-flex min-w-fit items-center rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50",
            {
              "ring-1 ring-inset ring-gray-300": rightAddonBorder,
              "border-y border-l-0 border-r border-gray-300": !rightAddonBorder,
            }
          )}
        >
          {rightAddon}
        </button>
      ),
    [rightAddonBorder, rightAddon, rightAddonClick]
  );

  return (
    <div className={className}>
      <div
        className={clsx({
          "flex justify-between": showCount || hintComponent,
        })}
      >
        {label && (
          <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-900">
            {label}
            {required && <span className="ml-1 text-red-600">(*)</span>}
          </label>
        )}

        {showCount && (
          <span className="text-sm leading-6 text-gray-500" id="email-optional">
            {maxLength
              ? t("components.text_field.counter", {
                  current: value ? ensureString(value).length : 0,
                  max: maxLength,
                })
              : t("components.text_field.character_counter", {
                  count: value ? ensureString(value).length : 0,
                })}
          </span>
        )}

        {hintComponent && !showCount && hintComponent}
      </div>

      {multiline ? (
        <div className="relative">
          <div
            className={clsx("overflow-hidden rounded-lg shadow-sm ring-1 ring-inset focus-within:ring-2", {
              "mt-2": label,
              "ring-gray-300 focus-within:ring-blue-700": !errorText,
              "ring-red-300 focus-within:ring-red-600": errorText,
              "border border-gray-200": disabled,
            })}
          >
            <textarea
              id={id}
              rows={rows}
              value={value}
              disabled={disabled}
              maxLength={maxLength}
              onChange={onChange}
              onBlur={onBlur}
              className={clsx(
                "block min-h-[56px] w-full border-0 bg-transparent py-1.5 focus:ring-0 sm:text-sm sm:leading-6",
                {
                  "text-gray-900 placeholder:text-gray-400": !errorText,
                  "text-red-900 placeholder:text-red-300": errorText,
                  "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500": disabled,
                  "resize-none": !resize,
                  "resize-y": resize,
                }
              )}
              {...(otherProps as React.HTMLAttributes<HTMLTextAreaElement>)}
            />

            {/* Spacer element to match the height of the toolbar */}
            {/* Matches height of button in toolbar (1px border + 36px content height) */}
            {toolbarComponent && (
              <div className="py-2" aria-hidden="true">
                <div className="py-px">
                  <div className="h-9" />
                </div>
              </div>
            )}
          </div>

          {toolbarComponent && toolbarComponent}
        </div>
      ) : (
        <div
          className={clsx("relative rounded-md shadow-sm", {
            "mt-2": label,
            flex: leftAddon || rightAddon,
          })}
        >
          {iconPlacement === "start" && iconComponent}
          {(iconPlacement !== "start" || !Icon) && prefixTextComponent}
          {(iconPlacement !== "start" || !Icon) && !prefixText && leftAddonComponent}
          <input
            id={id}
            type={type}
            value={value}
            disabled={disabled}
            maxLength={maxLength}
            onChange={onChange}
            onBlur={onBlur}
            className={clsx(
              {
                "block w-full py-1.5 font-normal focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6":
                  type !== "color",
              },
              {
                "pl-10": iconPlacement === "start" && Icon,
                "pr-10": iconPlacement === "end" && Icon,
              },
              {
                "pl-7": prefixText && (iconPlacement !== "start" || !Icon),
                "pr-12": suffixText && (iconPlacement !== "end" || !Icon),
              },
              {
                "rounded-md": !leftAddon || !rightAddon,
                "rounded-none": (leftAddon || rightAddon) && !Icon && !prefixText && !suffixText,
                "min-w-0 flex-1 rounded-r-md": leftAddon && (iconPlacement !== "start" || !Icon) && !prefixText,
                "rounded-l-md": rightAddon && (iconPlacement !== "end" || !Icon) && !suffixText,
                "border-0 ring-1 ring-inset": rightAddonBorder,
                "border border-r-0 border-gray-300 focus:border-0": !rightAddonBorder && rightAddon,
              },
              {
                "text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-blue-700": !errorText,
                "text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500": errorText,
                "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200":
                  disabled,
              },
              {
                "block h-9 w-full": type === "color",
              }
            )}
            {...(otherProps as React.HTMLAttributes<HTMLInputElement>)}
          />
          {iconPlacement === "end" && iconComponent}
          {(iconPlacement !== "end" || !Icon) && suffixTextComponent}
          {(iconPlacement !== "end" || !Icon) && !suffixText && rightAddonComponent}
        </div>
      )}

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
  );
};

export default TextField;
