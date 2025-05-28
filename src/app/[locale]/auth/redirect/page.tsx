"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect } from "react";

import { Loading } from "@/components/molecules";
import { SESSION_JWT_AUTH_DATA } from "@/constants/storage";
import { JwtAuthData } from "@/types/auth";
import { decodeJWT } from "@/utils/security";
import { setItemObject } from "@/utils/storage";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * handle token decode
   */
  const handleTokenDecode = useCallback(async () => {
    let redirectUrl = "/auth/signin";
    const token = searchParams.get("token");
    if (!token) {
      router.replace(redirectUrl);
      return;
    }

    const data = decodeJWT<JwtAuthData>(token);
    setItemObject(SESSION_JWT_AUTH_DATA, data);
    if (data?.redirectUrl) {
      redirectUrl = data.redirectUrl;
    }

    router.replace(redirectUrl);
  }, [router, searchParams]);

  useEffect(() => {
    handleTokenDecode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Loading fullScreen size="large" />;
}
