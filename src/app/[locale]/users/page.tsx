"use client";

import { useRouter } from "next-intl/client";
import { useEffect } from "react";

import { Loading } from "@/components/molecules";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/users/profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Loading fullScreen size="large" />;
}
