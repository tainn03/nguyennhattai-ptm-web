"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { VehicleList } from "@/components/organisms";
import { useBreadcrumb } from "@/redux/actions";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const t = useTranslations();
    const { setBreadcrumb } = useBreadcrumb();
    const { orgLink } = props;

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("vehicle.manage"), link: `${orgLink}` },
        { name: t("vehicle.title"), link: `${orgLink}/vehicles` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <VehicleList {...props} />;
  },
  {
    resource: "vehicle",
    action: "find",
  }
);
