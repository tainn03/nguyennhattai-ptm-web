"use client";

import { ReactNode, useMemo } from "react";

import { Loading } from "@/components/molecules";
import { AccessDenied } from "@/components/organisms";
import { usePermission } from "@/hooks";
import { DefaultReactProps } from "@/types";
import { ActionType, ResourceType } from "@/types/permission";

export type AuthorizationProps = DefaultReactProps & {
  resource?: ResourceType;
  action?: ActionType | ActionType[];
  type?: "all" | "oneOf";
  showLoading?: boolean;
  showAccessDenied?: boolean;
  alwaysAuthorized?: boolean;
  isAccessDenied?: boolean;
  fallbackComponent?: ReactNode;
};

const Authorization = ({
  resource,
  action,
  type = "all",
  showLoading = true,
  showAccessDenied = false,
  alwaysAuthorized = false,
  isAccessDenied,
  fallbackComponent,
  children,
}: AuthorizationProps) => {
  const { isLoading, hasPermission } = usePermission();

  const isPermitted = useMemo(() => {
    if (alwaysAuthorized) {
      return true;
    }
    if (!resource || !action) {
      return false;
    }

    const actions = typeof action === "string" ? [action] : action;
    switch (type) {
      case "all":
        return !actions.some((item) => !hasPermission(item, resource));
      case "oneOf":
        return actions.some((item) => hasPermission(item, resource));
      default:
        return false;
    }
  }, [hasPermission, resource, action, type, alwaysAuthorized]);

  const notPermittedComponent = useMemo(
    () => (showAccessDenied ? <AccessDenied /> : fallbackComponent),
    [fallbackComponent, showAccessDenied]
  );

  if (isLoading && showLoading) {
    return <Loading size="medium" />;
  }

  return <>{!isLoading && (isPermitted && !isAccessDenied ? children : notPermittedComponent)}</>;
};

export default Authorization;
