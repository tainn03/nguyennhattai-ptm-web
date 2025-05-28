"use client";

import { ClassValue } from "clsx";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useUserGuide } from "@/hooks";
import { UserGuideRequest } from "@/hooks/useUserGuide";
import { fetchUserGuideInfo } from "@/services/client/userGuide";
import { UserGuideInfo } from "@/types/strapi";
import { cn } from "@/utils/twcn";

type UserGuideTriggerProps = UserGuideRequest & {
  inline?: boolean;
  className?: ClassValue;
};

const UserGuideTrigger = ({ targetPath, targetElement, inline = true, className }: UserGuideTriggerProps) => {
  const t = useTranslations();
  const { open, documentationLink, openUserGuide, closeUserGuide } = useUserGuide();
  const [userGuideInfo, setUserGuideInfo] = useState<UserGuideInfo>();

  const fetchUserGuide = useCallback(async () => {
    if (!targetPath) {
      return;
    }

    const result = await fetchUserGuideInfo(targetPath, targetElement);
    if (result) {
      setUserGuideInfo(result);
      if (open && result.documentationLink !== documentationLink) {
        closeUserGuide();
      }
    } else {
      closeUserGuide();
    }
  }, [closeUserGuide, documentationLink, open, targetElement, targetPath]);

  useEffect(() => {
    fetchUserGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPath]);

  const handleOpenUserGuide = useCallback(() => {
    openUserGuide({
      targetPath,
      ...(targetElement && { targetElement }),
      documentationLink: userGuideInfo?.documentationLink,
    });
  }, [openUserGuide, targetElement, targetPath, userGuideInfo?.documentationLink]);

  if (!userGuideInfo?.documentationLink) {
    return null;
  }

  return (
    <div
      onClick={handleOpenUserGuide}
      className={cn(
        "cursor-pointer text-sm font-normal text-blue-500 hover:text-blue-600",
        {
          "mx-2 inline-block": inline,
        },
        className
      )}
    >
      {t("components.user_guide_trigger.label")}
    </div>
  );
};

export default UserGuideTrigger;
