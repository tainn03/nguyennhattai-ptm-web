"use client";

import { useRouter } from "next-intl/client";
import { useEffect } from "react";

import { Loading } from "@/components/molecules";
import { withOrg } from "@/utils/client";

export default withOrg(({ orgLink }) => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${orgLink}/order-groups/base`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Loading fullScreen size="large" />;
});
