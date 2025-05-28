"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { getAppInfoAction } from "@/actions/app-actions";
import { AppInfo } from "@/types/auth";

const AppInfoBox = () => {
  const t = useTranslations();

  const [appInfo, setAppInfo] = useState<AppInfo>();

  const getAppVersion = useCallback(async () => {
    const appInfo = await getAppInfoAction();
    setAppInfo(appInfo);
  }, []);

  useEffect(() => {
    getAppVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex justify-center text-sm font-light leading-6 text-gray-700">
        {t("org_setting_member.copy_right")}
      </div>
      <div className="flex justify-center text-sm font-light leading-6 text-gray-700">
        {t("org_setting_member.app_version_info", {
          version: appInfo?.version,
        })}
      </div>
    </div>
  );
};

export default AppInfoBox;
