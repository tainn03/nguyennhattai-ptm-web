"use client";

import { useRouter } from "next-intl/client";
import { useEffect } from "react";

import { Loading } from "@/components/molecules";
import { useOrgSettingExtendedStorage } from "@/hooks";
import { withOrg } from "@/utils/client";
import { isTrue } from "@/utils/string";

export default withOrg(({ orgLink }) => {
  const router = useRouter();
  const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();

  useEffect(() => {
    if (isTrue(orderConsolidationEnabled)) {
      router.push(`${orgLink}/order-groups/base`);
    } else {
      router.push(`${orgLink}/orders`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderConsolidationEnabled]);

  return <Loading fullScreen size="large" />;
});
