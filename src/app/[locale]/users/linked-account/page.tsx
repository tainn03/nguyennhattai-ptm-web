"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { InputGroup } from "@/components/molecules";
import { LinkedAccountList } from "@/components/organisms";
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
      { name: t("user_linked_account.title"), link: "/users/linked-account" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-12">
      <InputGroup
        title={t("user_linked_account.title")}
        description={t("user_linked_account.title_description")}
        showBorderBottom={false}
      >
        <div className="col-span-full">
          <h2 className="text-sm font-medium leading-6 text-gray-900">{t("user_linked_account.account_list_title")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("user_linked_account.account_list_description")}</p>
          <LinkedAccountList />
        </div>
      </InputGroup>
    </div>
  );
});
