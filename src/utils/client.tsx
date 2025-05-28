import { Fragment, ReactElement, useCallback, useEffect, useMemo, useState } from "react";

import { Loading } from "@/components/molecules";
import { AccessDenied } from "@/components/organisms";
import { useAuth, usePermission } from "@/hooks";
import { Permission } from "@/types/permission";
import { OrganizationInfo, UserInfo } from "@/types/strapi";

export type PageProps = {
  orgId?: number;
  org?: OrganizationInfo;
  orgLink?: string;
  userId: number;
  user: UserInfo;
};

export type AuthPermission = Permission & {
  checkAuthorized?: (userId: number) => Promise<boolean>;
};

export type ComponentProps = (props: PageProps) => ReactElement;

/**
 * Higher-Order Component (HOC) with Authentication
 *
 * This HOC wraps a component and provides authentication-related props, such as organization ID,
 * organization data, and user data. It ensures that the component is rendered only when the
 * necessary data is available and the user is authenticated.
 *
 * @param {ComponentProps} Component - The component to wrap with authentication props.
 * @returns {React.FunctionComponent} - A function component that renders the wrapped component with
 * authentication checks.
 */
export const withAuth = (Component: ComponentProps, permission?: AuthPermission): React.FunctionComponent =>
  function Page() {
    const { isAuthenticated, userId, user, orgId, org, orgLink } = useAuth();
    const [hasUserPermissions, setHasUserPermissions] = useState<boolean>(false);
    const { hasPermission } = usePermission();

    const checkHasUserPermissions = useCallback(async () => {
      if (permission?.checkAuthorized && userId && !hasUserPermissions) {
        const result = await permission.checkAuthorized(userId);
        setHasUserPermissions(result);
      }
    }, [hasUserPermissions, userId]);

    useEffect(() => {
      checkHasUserPermissions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isPermitted = useMemo(() => {
      if (!permission?.resource || !permission?.action || hasUserPermissions) {
        return true;
      }

      const { resource, action, type = "oneOf" } = permission;
      const actions = typeof action === "string" ? [action] : action;
      switch (type) {
        case "all":
          return !actions.some((item) => !hasPermission(item, resource));
        case "oneOf":
          return actions.some((item) => hasPermission(item, resource));
        default:
          return false;
      }
    }, [hasPermission, hasUserPermissions]);

    return useMemo(
      () => (
        <Fragment>
          {!isPermitted ? (
            <AccessDenied />
          ) : isAuthenticated && userId && user ? (
            <Component {...{ userId, user, orgId, org, orgLink }} />
          ) : (
            <Loading size="medium" />
          )}
        </Fragment>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [user, org, isPermitted]
    );
  };

export type OrgPageProps = Required<PageProps>;

export type OrgComponentProps = (props: OrgPageProps) => ReactElement;

/**
 * Higher-Order Component (HOC) with Organization Data
 *
 * This HOC wraps a component and provides organization-related props, such as organization ID,
 * organization data, and user data. It ensures that the component is rendered only when the
 * necessary data is available and the user is authenticated.
 *
 * @param {OrgComponentProps} Component - The component to wrap with organization-related props.
 * @returns {React.FunctionComponent} - A function component that renders the wrapped component with
 * organization checks.
 */
export const withOrg = (Component: OrgComponentProps, permission?: Permission): React.FunctionComponent =>
  function Page() {
    const { isAuthenticated, userId, user, orgId, org, orgLink } = useAuth();
    const { isLoading, hasPermission } = usePermission();

    const isPermitted = useMemo(() => {
      if (isLoading || !permission?.resource || !permission?.action) {
        return true;
      }

      const { resource, action, type = "oneOf" } = permission;
      const actions = typeof action === "string" ? [action] : action;
      switch (type) {
        case "all":
          return !actions.some((item) => !hasPermission(item, resource));
        case "oneOf":
          return actions.some((item) => hasPermission(item, resource));
        default:
          return false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, permission]);

    return useMemo(
      () => (
        <Fragment>
          {!isPermitted ? (
            <AccessDenied />
          ) : isAuthenticated && userId && user && orgId && org ? (
            <Component {...{ orgId, org, orgLink, userId, user }} />
          ) : (
            <Loading size="medium" />
          )}
        </Fragment>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [user, org, isPermitted]
    );
  };
