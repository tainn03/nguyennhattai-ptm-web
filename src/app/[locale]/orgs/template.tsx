"use client";

import { Loading } from "@/components/molecules";
import { useAuth } from "@/hooks";
import { DefaultReactProps } from "@/types";

export default function Template({ children }: DefaultReactProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen size="large" />;
  }

  return children;
}
