"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback } from "react";

import { Button } from "@/components/molecules";

const AccessDenied = () => {
  const t = useTranslations("components");
  const router = useRouter();

  const handleBackClick = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <main className="mx-auto grid min-h-full max-w-2xl place-items-center bg-white px-6 py-24 sm:py-28 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-blue-600">{t("access_denied.code")}</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{t("access_denied.title")}</h1>
        <p className="mt-6 text-base leading-7 text-gray-600">{t("access_denied.message")}</p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button onClick={handleBackClick}>
            <span aria-hidden="true">&larr;</span>
            {t("access_denied.back")}
          </Button>
          <a href="#" className="text-sm font-semibold text-gray-900">
            {t("access_denied.contact_support")} <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
};

export default AccessDenied;
