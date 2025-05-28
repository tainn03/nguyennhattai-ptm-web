"use client";

import { useRouter } from "next-intl/client";
import { useEffect } from "react";

import { Loading } from "@/components/molecules";
import { useAuth } from "@/hooks";

export default function Page() {
  const router = useRouter();
  const { orgLink } = useAuth();

  useEffect(() => {
    router.replace(`${orgLink}/settings/general`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLink]);

  return <Loading fullScreen size="large" />;
}
