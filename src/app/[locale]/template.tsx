"use client";

import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { useCallback, useEffect } from "react";

import { useAuth } from "@/hooks";
import { updateUserLanguageSetting } from "@/services/client/user";
import { DefaultReactProps } from "@/types";

const NatsWebsocket = dynamic(() => import("@/components/organisms/NatsWebsocket/NatsWebsocket"), { ssr: false });

export default function Template({ children }: DefaultReactProps) {
  const locale = useLocale();
  const { user, reloadUserProfile } = useAuth(false);

  /**
   * Handles the change of a user's language setting and updates it.
   * If the update is successful (result is true), it triggers a reload of the application.
   *
   * @param {number} settingId - The unique identifier for the user's language setting.
   * @param {string} locale - The desired language locale to set.
   */
  const changeLanguageSetting = useCallback(
    async (settingId: number, locale: string) => {
      const result = await updateUserLanguageSetting(settingId, locale);
      if (result) {
        await reloadUserProfile();
      }
    },
    [reloadUserProfile]
  );

  useEffect(() => {
    if (locale && user?.setting?.id && user?.setting?.locale !== locale) {
      changeLanguageSetting(Number(user.setting.id), locale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, user?.setting?.id, user?.setting?.locale]);

  return (
    <>
      {children}
      <NatsWebsocket />
    </>
  );
}
