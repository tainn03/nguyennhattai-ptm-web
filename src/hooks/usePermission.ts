"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppState } from "@/redux/states";
import { ActionType, Permission, ResourceType } from "@/types/permission";
import { isOrganizationOwner as checkIsOrganizationOwner } from "@/utils/auth";

const usePermission = (baseResource?: ResourceType) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { organizationMember, authorizationData } = useAppState();

  useEffect(() => {
    setIsLoading(!authorizationData);
  }, [authorizationData]);

  /**
   * An array of permissions associated with the user's role.
   */
  const permissions: Permission[] = useMemo(
    () => (authorizationData?.permissions || []) as Permission[],
    [authorizationData]
  );

  /**
   * Check if User is the Owner of the Organization.
   * A boolean value indicating whether the user is the owner of the organization.
   */
  const isOrganizationOwner = useMemo(
    () => checkIsOrganizationOwner(organizationMember?.organization, organizationMember?.member),
    [organizationMember]
  );

  /**
   * Check if User is an Organization Admin.
   * A boolean value indicating whether the user is an organization admin.
   */
  const isOrganizationAdmin = useMemo(() => !!organizationMember?.isAdmin, [organizationMember]);

  const hasPermission = useCallback(
    (action: ActionType, resource?: ResourceType) => {
      if (isOrganizationOwner || isOrganizationAdmin) {
        return true;
      }

      const resourceToCheck = resource || baseResource;
      const isPermitted = permissions.some((item) => item.resource === resourceToCheck && item.action === action);
      return isPermitted;
    },
    [permissions, isOrganizationOwner, isOrganizationAdmin, baseResource]
  );
  const canFind = useCallback((resource?: ResourceType) => hasPermission("find", resource), [hasPermission]);
  const canNew = useCallback((resource?: ResourceType) => hasPermission("new", resource), [hasPermission]);
  const canDetail = useCallback((resource?: ResourceType) => hasPermission("detail", resource), [hasPermission]);
  const canEdit = useCallback((resource?: ResourceType) => hasPermission("edit", resource), [hasPermission]);
  const canEditOwn = useCallback((resource?: ResourceType) => hasPermission("edit-own", resource), [hasPermission]);
  const canDelete = useCallback((resource?: ResourceType) => hasPermission("delete", resource), [hasPermission]);
  const canDeleteOwn = useCallback((resource?: ResourceType) => hasPermission("delete-own", resource), [hasPermission]);
  const canCancel = useCallback((resource?: ResourceType) => hasPermission("cancel", resource), [hasPermission]);
  const canExport = useCallback((resource?: ResourceType) => hasPermission("export", resource), [hasPermission]);
  const canDownload = useCallback((resource?: ResourceType) => hasPermission("download", resource), [hasPermission]);

  return {
    isLoading,
    isOrganizationOwner,
    isOrganizationAdmin,
    hasPermission,
    canFind,
    canNew,
    canDetail,
    canEdit,
    canEditOwn,
    canDelete,
    canCancel,
    canDeleteOwn,
    canExport,
    canDownload,
  };
};

export default usePermission;
