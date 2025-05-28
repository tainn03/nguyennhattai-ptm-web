"use client";

import { useEffect } from "react";

import { useDispatch } from "@/redux/actions";
import { APP_UPDATE_ORGANIZATION_MEMBER } from "@/redux/types";
import { DefaultReactProps } from "@/types";
import { OrganizationMemberInfo } from "@/types/strapi";

type AuthorizationProviderProps = DefaultReactProps & {
  organizationMember?: OrganizationMemberInfo;
};

export default function AuthorizationProvider({ children, organizationMember }: AuthorizationProviderProps) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (organizationMember) {
      dispatch<OrganizationMemberInfo>({
        type: APP_UPDATE_ORGANIZATION_MEMBER,
        payload: organizationMember,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
