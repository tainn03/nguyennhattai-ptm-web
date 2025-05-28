"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { INTERNAL_MESSAGE_REFRESH_INTERVAL } from "@/constants/internalMessage";
import { useAppState } from "@/redux/states";
import { LocaleType } from "@/types/locale";
import { formatDate, formatDateFromNow } from "@/utils/date";

type RelativeTimeTooltipProps = { value: Date | string };

const RelativeTimeTooltip = ({ value }: RelativeTimeTooltipProps) => {
  const t = useTranslations();
  const { userProfile } = useAppState();
  const [relativeTime, setRelativeTime] = useState<string | null>(null);

  useEffect(() => {
    const dateFromNow = formatDateFromNow(value, userProfile?.setting.locale as LocaleType);
    setRelativeTime(dateFromNow);
    const intervalId = setInterval(() => {
      setRelativeTime(dateFromNow);
    }, INTERNAL_MESSAGE_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [userProfile?.setting.locale, value]);

  return (
    <span
      className="py-0.5 text-xs leading-5 text-gray-500"
      data-tooltip-id="tooltip"
      data-tooltip-content={formatDate(value, t("common.format.datetime"))}
    >
      {relativeTime}
    </span>
  );
};

export default RelativeTimeTooltip;
