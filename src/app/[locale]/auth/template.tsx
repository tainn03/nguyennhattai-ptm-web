"use client";

import { useRouter } from "next-intl/client";
import { useEffect } from "react";

import { Loading } from "@/components/molecules";
import { useAuth } from "@/hooks";
import { DefaultReactProps } from "@/types";

export default function Template({ children }: DefaultReactProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/orgs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isLoading) {
    return <Loading fullScreen size="large" />;
  }

  return children;
}
