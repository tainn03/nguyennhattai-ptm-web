"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { NavigateAction } from "react-big-calendar";

import { Button, DatePicker } from "@/components/molecules";
import { useAppState } from "@/redux/states";
import { LocaleType } from "@/types/locale";
import { formatDate } from "@/utils/date";

type TimelineToolbarProps = {
  selectedMonth: Date | null;
  onNavigate: (key: string) => void;
  onChange: (date: Date | null) => void;
};

const TimelineToolbar = ({ selectedMonth, onNavigate, onChange }: TimelineToolbarProps) => {
  const t = useTranslations();
  const { userProfile } = useAppState();

  const handleNavigationClick = useCallback(
    (key: NavigateAction) => () => {
      onNavigate(key);
    },
    [onNavigate]
  );

  return (
    <div className="grid grid-cols-12 rounded-md rounded-b-none py-4">
      <div className="col-span-4 sm:col-span-4">
        <DatePicker
          selected={selectedMonth}
          onChange={onChange}
          className="ml-4 w-32"
          showMonthYearPicker
          dateFormat="MM/yyyy"
          mask="99/9999"
        />
      </div>
      <div className="col-span-8 ml-4 mt-2 sm:col-span-4">
        <div className="flex h-full items-center justify-center gap-x-4 text-gray-900">
          <button
            type="button"
            className="-m-1.5 flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={handleNavigationClick("PREV")}
          >
            <span className="sr-only">{t("order_plan.calendar.pre_month")}</span>
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="text-base font-semibold capitalize">
            {formatDate(selectedMonth, "MMMM YYYY", userProfile?.setting.locale as LocaleType)}
          </div>

          <button
            type="button"
            className="-m-1.5 flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={handleNavigationClick("NEXT")}
          >
            <span className="sr-only">{t("order_plan.calendar.next_month")}</span>
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mr-4 pl-[17px] pt-2.5 text-right sm:col-span-4">
        <Button size="small" variant="outlined" onClick={handleNavigationClick("TODAY")}>
          {t("vehicle_monitoring.timeline.today")}
        </Button>
      </div>
    </div>
  );
};

export default TimelineToolbar;
