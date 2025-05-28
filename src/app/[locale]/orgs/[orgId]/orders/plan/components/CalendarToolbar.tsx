"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { NavigateAction, ToolbarProps } from "react-big-calendar";

import { Button } from "@/components/molecules";

export type CalendarToolbarProps = ToolbarProps;

const CalendarToolbar = ({ label, onNavigate, localizer }: CalendarToolbarProps) => {
  const t = useTranslations();
  const handleNavigationClick = useCallback(
    (key: NavigateAction) => () => {
      onNavigate(key);
    },
    [onNavigate]
  );

  return (
    <div className="grid grid-cols-12 rounded-md rounded-b-none border border-gray-200 py-4">
      <div className="col-span-8 col-start-1 md:col-span-4 md:col-start-5">
        <div className="flex h-full items-center justify-center gap-x-4 text-gray-900">
          <button
            type="button"
            className="-m-1.5 flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={handleNavigationClick("PREV")}
          >
            <span className="sr-only">{t("order_plan.calendar.pre_month")}</span>
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="text-base font-semibold capitalize">{label}</div>
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
      <div className="col-span-4 col-start-9 mr-4 text-end md:col-span-4">
        <Button size="small" variant="outlined" onClick={handleNavigationClick("TODAY")}>
          {localizer.messages.today}
        </Button>
      </div>
    </div>
  );
};

export default CalendarToolbar;
