"use client";

import moment from "moment";
import { useTranslations } from "next-intl";

import { DateTimeDisplayType } from "@/types/storage";

export type DateTimeLabelProps = {
  value?: Date | string | number | null;
  type: DateTimeDisplayType;
  emptyLabel?: string;
};

const DateTimeLabel = ({ value, type, emptyLabel = "" }: DateTimeLabelProps) => {
  const t = useTranslations();

  return value ? <>{moment(value).format(t(`common.format.${type}`))}</> : emptyLabel;
};

export default DateTimeLabel;
