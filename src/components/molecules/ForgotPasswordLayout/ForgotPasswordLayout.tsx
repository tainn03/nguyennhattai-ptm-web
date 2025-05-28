"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import React, { ReactNode, useCallback } from "react";

import { Logo } from "@/components/atoms";
import { SESSION_FORGOT_PASSWORD } from "@/constants/storage";
import { DefaultReactProps } from "@/types";
import { removeItem } from "@/utils/storage";

import { Button } from "..";

type ForgotPasswordLayoutProps = Partial<DefaultReactProps> & {
  showLogo?: boolean;
  title?: string;
  description?: ReactNode;
  actionComponent?: ReactNode;
  showCancel?: boolean;
};

const ForgotPasswordLayout = ({
  showLogo = true,
  title,
  description,
  children,
  actionComponent,
  showCancel = true,
}: ForgotPasswordLayoutProps) => {
  const router = useRouter();

  const handleCancelClick = useCallback(() => {
    removeItem(SESSION_FORGOT_PASSWORD);
    router.replace("/auth/signin");
  }, [router]);

  const t = useTranslations();

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center">{showLogo && <Logo size="large" />}</div>
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">{title}</h2>
        <div className="mt-2 text-center text-sm leading-6 text-gray-500">{description}</div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {children}

        {showCancel && (
          <div className="mt-6">
            <Button variant="outlined" className="w-full" onClick={handleCancelClick}>
              {t("common.cancel")}
            </Button>
          </div>
        )}

        <div className="mt-10 text-center text-sm text-gray-500">{actionComponent}</div>
      </div>
    </div>
  );
};

export default ForgotPasswordLayout;
