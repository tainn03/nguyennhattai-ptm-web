"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import debounce from "lodash/debounce";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { TextField } from "@/components/molecules";
import { TextFieldProps } from "@/components/molecules/TextField/TextField";
import { FilterProperty } from "@/types/filter";
import { ensureString } from "@/utils/string";

export type QuickSearchProps = TextFieldProps & {
  filters: FilterProperty[];
  onSearch?: (_filters: FilterProperty[]) => void;
};

const QuickSearch = ({
  filters,
  name = "keywords",
  icon = MagnifyingGlassIcon,
  rightAddon,
  placeholder,
  onSearch,
  className,
  ...otherProps
}: QuickSearchProps) => {
  const t = useTranslations("components");
  const internalFiltersRef = useRef<FilterProperty[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    internalFiltersRef.current = filters;
    setValue(ensureString(internalFiltersRef.current.find((option) => option.name === name)?.value));
  }, [filters, name]);

  const handleSearch = useCallback(() => {
    onSearch && onSearch(internalFiltersRef.current);
  }, [onSearch]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setValue(value);
      internalFiltersRef.current = internalFiltersRef.current.map((option) => {
        if (option.name === name) {
          return {
            ...option,
            value,
          };
        }
        return option;
      });
    },
    [name]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleKeyUp = useCallback(debounce(handleSearch, 500), [handleSearch]);

  return (
    <div className={clsx(className, "sm:w-screen sm:max-w-xs md:max-w-sm")}>
      <TextField
        name={name}
        value={ensureString(value)}
        icon={icon}
        rightAddon={rightAddon || t("quick_search.search")}
        rightAddonClick={handleSearch}
        onKeyUp={handleKeyUp}
        onChange={handleChange}
        placeholder={placeholder || t("quick_search.placeholder")}
        className="[&_input]:rounded-r-none"
        {...otherProps}
      />
    </div>
  );
};

export default QuickSearch;
