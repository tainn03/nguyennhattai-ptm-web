"use client";

import { useEffect } from "react";

import { PERSISTENT_ORGANIZATION, SESSION_ORGANIZATION_CACHED } from "@/constants/storage";
import { DefaultReactProps } from "@/types";
import { OrganizationInfo } from "@/types/strapi";
import { setItemObject, setItemString } from "@/utils/storage";

type SignInProviderProps = DefaultReactProps & {
  organization?: OrganizationInfo;
};

export default function SignInProvider({ children, organization }: SignInProviderProps) {
  useEffect(() => {
    if (organization) {
      setItemObject(PERSISTENT_ORGANIZATION, organization, { provider: "persistent" });
      setItemString(SESSION_ORGANIZATION_CACHED, organization.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
