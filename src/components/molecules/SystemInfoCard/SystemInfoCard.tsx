"use client";

import { useTranslations } from "next-intl";
import React, { useMemo } from "react";

import { Card, CardContent, CardHeader, DateTimeLabel, DescriptionProperty2 } from "@/components/atoms";
import { UserInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";

export type SystemInfo = {
  createdAt?: Date;
  createdByUser?: Partial<UserInfo>;
  updatedAt?: Date;
  updatedByUser?: Partial<UserInfo>;
};

export type SystemInfoCardProps = {
  loading?: boolean;
  entity?: SystemInfo | null;
  className?: string;
};

const SystemInfoCard = ({ loading, entity, className }: SystemInfoCardProps) => {
  const t = useTranslations("components");
  const createdAccountInfo = useMemo(() => getAccountInfo(entity?.createdByUser), [entity?.createdByUser]);
  const updatedAccountInfo = useMemo(() => getAccountInfo(entity?.updatedByUser), [entity?.updatedByUser]);

  return (
    <Card className={className}>
      <CardHeader loading={loading} title={t("system_info_card.title")} />
      <CardContent>
        <DescriptionProperty2 loading={loading} label={t("system_info_card.created_at")}>
          <DateTimeLabel type="datetime" value={entity?.createdAt} />
        </DescriptionProperty2>
        <DescriptionProperty2 loading={loading} label={t("system_info_card.created_by")}>
          {createdAccountInfo.displayName}
        </DescriptionProperty2>

        <DescriptionProperty2 loading={loading} label={t("system_info_card.updated_at")}>
          <DateTimeLabel type="datetime" value={entity?.updatedAt} />
        </DescriptionProperty2>
        <DescriptionProperty2 loading={loading} label={t("system_info_card.updated_by")}>
          {updatedAccountInfo.displayName}
        </DescriptionProperty2>
      </CardContent>
    </Card>
  );
};

export default SystemInfoCard;
