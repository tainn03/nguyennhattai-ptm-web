"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { InputGroup } from "@/components/molecules";
import { LocaleSwitcher } from "@/components/organisms";
import { useBreadcrumb } from "@/redux/actions";
import { withAuth } from "@/utils/client";

export default withAuth(() => {
  const t = useTranslations();
  const { setBreadcrumb } = useBreadcrumb();

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("user_profile.account"), link: "/users/profile" },
      { name: t("user_language.title"), link: "/users/language" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-12">
      <InputGroup
        title={t("user_language.locale_title")}
        description={t("user_language.locale_description")}
        showBorderBottom={false}
      >
        <div className="col-span-full">
          <h2 className="text-sm font-medium leading-6 text-gray-900">{t("user_language.options")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("user_language.options_description")}</p>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <LocaleSwitcher />
          </div>
        </div>
      </InputGroup>
    </div>
  );
});
