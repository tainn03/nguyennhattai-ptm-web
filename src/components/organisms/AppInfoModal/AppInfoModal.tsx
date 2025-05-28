"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { getAppInfoAction } from "@/actions/app-actions";
import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Link, Logo } from "@/components/atoms";
import { Modal } from "@/components/molecules";
import { useAuth } from "@/hooks";
import { AppInfo } from "@/types/auth";

import { Helper } from "..";

export type AppInfoModalProps = {
  open: boolean;
  onClose: () => void;
};

const AppInfoModal = ({ open, onClose }: AppInfoModalProps) => {
  const { orgId, orgLink } = useAuth();
  const t = useTranslations("components.app_information_modal");
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
    <Modal open={open} showCloseButton={true} size="2xl" allowOverflow={true} onClose={onClose}>
      <ModalHeader title={t("title")} />
      <ModalContent padding={false}>
        <div className="flex items-center gap-10 px-4 pb-4 pt-5 sm:p-6">
          <div className="flex justify-center">
            <Link useDefaultStyle href={orgId && orgLink ? `${orgLink}/dashboard` : "/orgs"} className="inline-flex">
              <Logo size="xlarge" />
            </Link>
          </div>
          <div className="space-y-2 pt-1">
            <div>
              <h1>{t("app_version_title")}</h1>
              <p className="text-sm text-gray-700">{appInfo?.version}</p>
            </div>
            <div>
              <h1>{t("build_hash")}</h1>
              <p className="break-all text-sm text-gray-700 md:w-full">{appInfo?.buildHash}</p>
            </div>
            <div>
              <h1>{t("build_date")}</h1>
              <p className="text-sm text-gray-700">{appInfo?.buildDate}</p>
            </div>
            <div className="flex flex-col md:flex-row md:gap-1">
              <Link
                useDefaultStyle
                href={t("terms_of_service.link")}
                target="_blank"
                className="inline-flex font-light"
              >
                {t("terms_of_service.title")}
              </Link>
              <span className="hidden md:block"> - </span>
              <Link useDefaultStyle href={t("privacy_policy.link")} target="_blank" className="inline-flex font-light">
                {t("privacy_policy.title")}
              </Link>
            </div>
          </div>
        </div>
        <hr className="border-t border-gray-200" />
        <Helper />
      </ModalContent>
      <ModalActions align="center">
        <p className="text-center text-sm font-light leading-6 text-gray-700">{t("copyright_notice")}</p>
      </ModalActions>
    </Modal>
  );
};

export default AppInfoModal;
