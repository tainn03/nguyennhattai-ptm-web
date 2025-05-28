"use client";

import { useRouter } from "next-intl/client";

import { NotFound } from "@/components/organisms";

export default function Page() {
  const router = useRouter();

  /**
   * Navigates to the home page of the application.
   */
  const handleGoHome = () => {
    router.push("/");
  };

  return <NotFound onGoHome={handleGoHome} />;
}
