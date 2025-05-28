"use client";

import { Popover, Transition } from "@headlessui/react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { ChangeEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiaSortAlphaDownAltSolid as LiaSortAlphaDownAltSolidIcon,
  LiaSortAlphaUpAltSolid as LiaSortAlphaUpAltSolidIcon,
} from "react-icons/lia";
import { RiFilter2Fill as RiFilter2FillIcon, RiFilter2Line as RiFilter2LineIcon } from "react-icons/ri";

import { Button, Combobox, DatePicker, NumberField, TextField } from "@/components/molecules";
import CheckboxGroup, { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import RadioGroup, { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { FilterProperty, SortType } from "@/types/filter";
import { hasFilter as utilHasFilter } from "@/utils/filter";
import { ensureString } from "@/utils/string";

export type TableFilterMenuProps = {
  label?: string;
  align?: "left" | "center" | "right";
  filters: FilterProperty[];
  hideSort?: boolean;
  sortType?: SortType;
  actionPlacement?: "left" | "center" | "right";
  onApply?: (_filters: FilterProperty[], _sortType?: SortType) => void;
  className?: string;
};

const TableFilterMenu = ({
  label = "",
  filters,
  hideSort,
  sortType,
  align = "left",
  actionPlacement = "center",
  onApply,
  className,
}: TableFilterMenuProps) => {
  const t = useTranslations();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [internalFilters, setInternalFilters] = useState(filters);
  const [internalSort, setInternalSort] = useState(sortType);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const sortOptions: RadioItem[] = useMemo(
    () => [
      { value: "asc", label: t("components.table_filter_menu.sort_asc") },
      { value: "desc", label: t("components.table_filter_menu.sort_desc") },
    ],
    [t]
  );

  useEffect(() => {
    setInternalFilters(filters);
  }, [filters]);

  useEffect(() => {
    setInternalSort(sortType);
  }, [sortType]);

  useEffect(() => {
    if (!isPopoverOpen) {
      setInternalFilters(filters);
      setInternalSort(sortType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPopoverOpen]);

  const hasFilter = useMemo(() => filters.some((item) => utilHasFilter(item)), [filters]);

  const hasSort = useMemo(() => !!sortType, [sortType]);

  const handleSort = useCallback((item: RadioItem) => {
    setInternalSort(item.value as SortType);
  }, []);

  const handleSortIconClick = useCallback(
    (item: RadioItem) => () => {
      if (item.value !== internalSort) {
        setInternalSort(item.value as SortType);
      }
    },
    [internalSort]
  );

  const handleChange = useCallback(
    (prop: FilterProperty) => (event: unknown) => {
      let value: Date | string | CheckboxItem[] | undefined;
      let optionSelected: ComboboxItem | undefined;
      switch (prop.type) {
        case "date":
        case "checkbox":
          value = event as Date | CheckboxItem[];
          break;
        case "text":
        case "number":
          value = (event as ChangeEvent<HTMLInputElement | HTMLTextAreaElement>).target.value;
          break;
        case "combobox": {
          value = event as string;
          optionSelected = prop.items?.find((item) => item.value === value);
          break;
        }
        default:
          break;
      }
      if (value !== undefined) {
        setInternalFilters((prevValue) =>
          prevValue.map((option) => {
            if (option.name === prop.name) {
              return {
                ...option,
                ...(option.type === "combobox" && { optionSelected }),
                value,
              };
            }
            return option;
          })
        );
      }
    },
    []
  );

  const handleApply = useCallback(() => {
    buttonRef.current?.click();
    onApply && onApply(internalFilters, internalSort);
  }, [onApply, internalFilters, internalSort]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && isPopoverOpen) {
        buttonRef.current?.click();
        handleApply();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleApply, isPopoverOpen]);

  return (
    <div
      className={clsx(className, "flex flex-nowrap items-center gap-2", {
        "justify-end": align === "right",
        "justify-center": align === "center",
        "justify-start": align === "left",
      })}
    >
      <span>{label}</span>
      <div className="relative float-right inline-flex">
        <Popover className="flex">
          {({ open }: { open: boolean }) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useEffect(() => {
              setIsPopoverOpen(open);
            }, [open]);

            return (
              <>
                <Popover.Button
                  ref={buttonRef}
                  className={clsx(
                    "rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2",
                    {
                      "text-opacity-90": !open,
                    }
                  )}
                >
                  {hasFilter || hasSort ? (
                    <RiFilter2FillIcon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  ) : (
                    <RiFilter2LineIcon className="h-5 w-5 text-gray-700" aria-hidden="true" />
                  )}
                </Popover.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                  <Popover.Panel
                    className={clsx("absolute z-10 mt-6 w-screen max-w-[270px] transform px-4 sm:px-0", {
                      "left-0": actionPlacement === "right",
                      "left-1/2 -translate-x-1/2": actionPlacement === "center",
                      "right-0": actionPlacement === "left",
                    })}
                  >
                    <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                      {/* Sort area */}
                      {!hideSort && (
                        <div className="flex justify-between rounded-t-lg bg-white p-4">
                          <RadioGroup
                            className="[&>fieldset>div]:space-y-0"
                            name="sort"
                            direction="column"
                            items={sortOptions}
                            value={internalSort}
                            onChange={handleSort}
                          />
                          <div className="space-y-1">
                            <LiaSortAlphaUpAltSolidIcon
                              className="block h-5 w-5"
                              onClick={handleSortIconClick(sortOptions[0])}
                              aria-hidden="true"
                            />
                            <LiaSortAlphaDownAltSolidIcon
                              className="block h-5 w-5"
                              onClick={handleSortIconClick(sortOptions[1])}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      )}

                      {/* Filter area */}
                      {filters.length > 0 && (
                        <div
                          className={clsx("border-t bg-white px-4 pt-4", {
                            "rounded-t-lg border-0": hideSort,
                          })}
                        >
                          {internalFilters.map((option) => (
                            <div
                              key={option.name}
                              className={clsx({
                                "space-y-3 pb-4": option.type !== "checkbox",
                                "last:pb-4": option.type === "checkbox",
                              })}
                            >
                              <div
                                className={clsx("flex", {
                                  "flex-col gap-2": option.type !== "checkbox",
                                })}
                              >
                                {/* Checkbox */}
                                {option.type === "checkbox" && (
                                  <CheckboxGroup
                                    label={option.label && t(option.label)}
                                    name={option.name}
                                    direction="column"
                                    onChange={handleChange(option)}
                                    items={((option.value || []) as CheckboxItem[]).map((item) => ({
                                      ...item,
                                      ...(item.subLabel && { subLabel: t(item.subLabel) }),
                                      label: item.label && t(item.label),
                                    }))}
                                    className="[&>fieldset>div]:space-y-0"
                                  />
                                )}

                                {/* Text */}
                                {option.type === "text" && (
                                  <TextField
                                    label={option.label && t(option.label)}
                                    name={option.name}
                                    type={option.type}
                                    id={option.id}
                                    value={ensureString(option.value)}
                                    onChange={handleChange(option)}
                                    placeholder={option.placeholder && t(option.placeholder)}
                                    className="[&>*:nth-child(2)]:mt-1"
                                  />
                                )}

                                {/* Number */}
                                {option.type === "number" && (
                                  <NumberField
                                    label={option.label && t(option.label)}
                                    name={option.name}
                                    id={option.id}
                                    value={ensureString(option.value)}
                                    onChange={handleChange(option)}
                                    placeholder={option.placeholder && t(option.placeholder)}
                                    className="[&>*:nth-child(2)]:mt-1"
                                  />
                                )}

                                {/* Date */}
                                {option.type === "date" && (
                                  <DatePicker
                                    label={option.label && t(option.label)}
                                    name={option.name}
                                    id={option.id}
                                    selected={(option.value as Date) && new Date(option.value as Date)}
                                    placeholder={option.placeholder && t(option.placeholder)}
                                    onChange={handleChange(option)}
                                    className="text-left [&>div>div>div]:mt-1"
                                  />
                                )}

                                {/* combobox */}
                                {option.type === "combobox" && (
                                  <Combobox
                                    label={option.label && t(option.label)}
                                    emptyLabel={option.placeholder && t(option.placeholder)}
                                    placeholder={option.placeholder && t(option.placeholder)}
                                    value={option.optionSelected?.value || (option.value as string)}
                                    onChange={handleChange(option)}
                                    items={option.items as ComboboxItem[]}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="rounded-b-lg border-t bg-gray-50 p-4">
                        <Button onClick={handleApply} className="w-full">
                          {t("components.table_filter_menu.apply")}
                        </Button>
                      </div>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            );
          }}
        </Popover>
      </div>
    </div>
  );
};

export default TableFilterMenu;
