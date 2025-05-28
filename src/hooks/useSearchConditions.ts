"use client";

import { useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { FilterOptions } from "@/types/filter";
import { mergeConditions } from "@/utils/filter";

const useSearchConditions = (
  options: FilterOptions,
  pageSizeOption?: number[]
): [FilterOptions, Dispatch<SetStateAction<FilterOptions>>] => {
  const searchParams = useSearchParams();
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(options);

  useEffect(() => {
    if (searchParams.toString()) {
      const newOptions = mergeConditions(options, searchParams, pageSizeOption);
      setFilterOptions(newOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [filterOptions, setFilterOptions];
};

export default useSearchConditions;
