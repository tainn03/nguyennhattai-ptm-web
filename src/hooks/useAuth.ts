"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { dynamicAnalysesFetcherAction } from "@/actions/dynamicAnalyses";
import { getOrganizationSettingsExtended } from "@/actions/organizationSettingExtended";
import {
  DateTimeDisplayType,
  OrganizationSettingExtendedKey,
  TripStatusUpdateType,
} from "@/constants/organizationSettingExtended";
import { SESSION_ORGANIZATION, SESSION_ORGANIZATION_SETTING_EXTENDED, SESSION_USER_PROFILE } from "@/constants/storage";
import { useDispatch } from "@/redux/actions";
import { useAppState } from "@/redux/states";
import {
  APP_DELETE_ORGANIZATION,
  APP_DELETE_USER_PROFILE,
  APP_UPDATE_ORGANIZATION,
  APP_UPDATE_USER_PROFILE,
} from "@/redux/types";
import { getOrganization } from "@/services/client/organization";
import { getUserProfile } from "@/services/client/user";
import { UserSession } from "@/types/auth";
import { OrganizationInfo, UserInfo } from "@/types/strapi";
import { getOrganizationLink } from "@/utils/auth";
import { getItemObject, removeItem, setItemObject } from "@/utils/storage";

declare global {
  interface Window {
    $__userProfileLoading?: boolean;
    $__organizationLoading?: boolean;
    $__updatingOrganizationId?: number | null;
  }
}

const useAuth = (authRequired = true) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { userProfile: user, organization: org } = useAppState();

  // Next-Auth session
  const {
    status,
    data: session,
    update,
  } = useSession({
    required: authRequired,

    /**
     * Clear all authentication data and redirect to signin page
     */
    onUnauthenticated: () => {
      removeItem(SESSION_USER_PROFILE);
      removeItem(SESSION_ORGANIZATION);
      removeItem(SESSION_ORGANIZATION_SETTING_EXTENDED);
      router.replace("/auth/signin");
    },
  });

  const isLoadingRef = useRef<"loading" | "authenticated" | "unauthenticated">(status);

  // User session
  const userSession = useMemo(() => {
    const userInfo = session?.user as UserSession | undefined;
    if (userInfo) {
      const { id, orgId, ...otherUserInfo } = userInfo;
      return {
        ...otherUserInfo,
        id: id && Number(id),
        orgId: orgId && Number(orgId),
      };
    }
  }, [session?.user]);

  // Authentication status
  const [isLoading, isAuthenticated, isUnauthenticated] = useMemo(() => {
    return [status === "loading", status === "authenticated", status === "unauthenticated"];
  }, [status]);

  // Root URL for organization
  const orgLink = useMemo(() => getOrganizationLink(org), [org]);

  /**
   * Handling Unauthenticated Users. Removes the user profile data from session storage
   * and dispatches an action to delete the user profile from the Redux store.
   */
  useEffect(() => {
    if (!authRequired && isUnauthenticated) {
      isLoadingRef.current = "unauthenticated";
      removeItem(SESSION_USER_PROFILE);
      removeItem(SESSION_ORGANIZATION);
      removeItem(SESSION_ORGANIZATION_SETTING_EXTENDED);
      dispatch({ type: APP_DELETE_USER_PROFILE });
      dispatch({ type: APP_DELETE_ORGANIZATION });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authRequired, isUnauthenticated]);

  /**
   * Fetches organization data by its unique ID and sets it in the component's state.
   *
   * @param {number} orgId - The ID of the organization to fetch.
   */
  const fetchOrganization = useCallback(
    async (orgId: number) => {
      // Ignore if the organization is loading
      if (window.$__organizationLoading) {
        return;
      }

      // Ignore if the organization is already available.
      if (org && org.id === orgId) {
        return;
      }

      // Fetch Organization from session storage
      const storedOrg = getItemObject<OrganizationInfo>(SESSION_ORGANIZATION);
      if (storedOrg && storedOrg.id === orgId) {
        const dynamicAnalysis = storedOrg?.code ? await dynamicAnalysesFetcherAction(storedOrg?.code) : [];
        dispatch<OrganizationInfo>({
          type: APP_UPDATE_ORGANIZATION,
          payload: {
            ...storedOrg,
            dynamicAnalysis,
          },
        });
        return;
      } else {
        removeItem(SESSION_ORGANIZATION);
      }

      // Fetch Organization from API
      window.$__organizationLoading = true;
      let newOrg = await getOrganization(orgId, { retrieveSetting: true });

      const orgSettingExtended = await getOrganizationSettingsExtended(orgId, [
        OrganizationSettingExtendedKey.ORGANIZATION_ORDER_RELATED_DATE_FORMAT,
        OrganizationSettingExtendedKey.TRIP_STATUS_UPDATE_TYPE,
        OrganizationSettingExtendedKey.USE_FUEL_COST_MANAGEMENT,
        OrganizationSettingExtendedKey.ALLOW_ORDER_EDIT_ANY_STATUS,
        OrganizationSettingExtendedKey.MERGE_DELIVERY_AND_PICKUP,
        OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED,
        OrganizationSettingExtendedKey.ENABLE_CBM_FIELD,
      ]);

      setItemObject(SESSION_ORGANIZATION_SETTING_EXTENDED, {
        [OrganizationSettingExtendedKey.ORGANIZATION_ORDER_RELATED_DATE_FORMAT]:
          orgSettingExtended?.[OrganizationSettingExtendedKey.ORGANIZATION_ORDER_RELATED_DATE_FORMAT] ||
          DateTimeDisplayType.DATE,
        [OrganizationSettingExtendedKey.TRIP_STATUS_UPDATE_TYPE]:
          orgSettingExtended?.[OrganizationSettingExtendedKey.TRIP_STATUS_UPDATE_TYPE] || TripStatusUpdateType.DEFAULT,
        [OrganizationSettingExtendedKey.USE_FUEL_COST_MANAGEMENT]:
          orgSettingExtended?.[OrganizationSettingExtendedKey.USE_FUEL_COST_MANAGEMENT] || false,
        [OrganizationSettingExtendedKey.ALLOW_ORDER_EDIT_ANY_STATUS]:
          orgSettingExtended?.[OrganizationSettingExtendedKey.ALLOW_ORDER_EDIT_ANY_STATUS] || false,
        [OrganizationSettingExtendedKey.MERGE_DELIVERY_AND_PICKUP]:
          orgSettingExtended?.[OrganizationSettingExtendedKey.MERGE_DELIVERY_AND_PICKUP] || false,
        [OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED]:
          orgSettingExtended?.[OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED] || false,
        [OrganizationSettingExtendedKey.ENABLE_CBM_FIELD]:
          orgSettingExtended?.[OrganizationSettingExtendedKey.ENABLE_CBM_FIELD] || false,
      });

      if (newOrg) {
        // Stored to session storage and redux state
        newOrg = { ...newOrg, id: Number(newOrg.id) };
        setItemObject(SESSION_ORGANIZATION, newOrg);
        const dynamicAnalysis = newOrg?.code ? await dynamicAnalysesFetcherAction(newOrg?.code) : [];
        dispatch<OrganizationInfo>({
          type: APP_UPDATE_ORGANIZATION,
          payload: {
            ...newOrg,
            dynamicAnalysis,
          },
        });
      }
      window.$__organizationLoading = false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [org]
  );

  const updateSessionAndFetchOrganization = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    const orgId = user.setting?.organizationId && Number(user.setting?.organizationId);
    if (window.$__updatingOrganizationId === orgId) {
      return;
    }

    window.$__updatingOrganizationId = orgId;
    if (userSession?.orgId === orgId) {
      if (orgId && !org) {
        // fetch organization data
        await fetchOrganization(orgId);
      }
    } else {
      // Update session orgId
      await update({ user: { orgId } });

      // fetch organization data
      orgId && (await fetchOrganization(orgId));
    }
    window.$__updatingOrganizationId = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.setting?.organizationId]);

  /**
   * Updating Session and fetches organization data
   */
  useEffect(() => {
    updateSessionAndFetchOrganization();
  }, [updateSessionAndFetchOrganization]);

  /**
   * Fetch User Profile based on the provided userId.
   * If a user profile is found in session storage, it dispatches an action to update
   * the Redux state with the stored profile. If not, it fetches the user profile from
   * the API, stores it in session storage, and updates the Redux state.
   *
   * @param {number} userId - The ID of the user whose profile is to be fetched.
   * @param {boolean} forceReload - The flag force reload profile from API.
   */
  const fetchUserProfile = useCallback(
    async (userId: number, forceReload = false) => {
      // Ignore if the user profile is loading
      if (window.$__userProfileLoading) {
        return;
      }

      if (!forceReload) {
        // Ignore if the user is already available.
        if (user && user.id === userId) {
          window.$__userProfileLoading = false;
          return;
        }

        // Fetch User Profile from session storage
        const storedUserProfile = getItemObject<UserInfo>(SESSION_USER_PROFILE);
        if (storedUserProfile && storedUserProfile.id === userId) {
          dispatch<UserInfo>({
            type: APP_UPDATE_USER_PROFILE,
            payload: storedUserProfile,
          });
          return;
        } else {
          removeItem(SESSION_USER_PROFILE);
        }
      }

      // Fetch User Profile from API
      window.$__userProfileLoading = true;
      let newUserProfile = await getUserProfile(userId);
      if (newUserProfile) {
        // Stored to session storage and redux state
        newUserProfile = { ...newUserProfile, id: Number(newUserProfile.id) };
        setItemObject(SESSION_USER_PROFILE, newUserProfile);
        dispatch<UserInfo>({
          type: APP_UPDATE_USER_PROFILE,
          payload: newUserProfile,
        });
      }
      window.$__userProfileLoading = false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  /**
   * Reload the user's profile data.
   *
   * @param {boolean} forceReload - The flag force reload profile from API.
   */
  const reloadUserProfile = useCallback(
    async (forceReload: boolean = true) => {
      if (isAuthenticated) {
        const userId = userSession?.id && Number(userSession?.id);
        userId && (await fetchUserProfile(userId, forceReload));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthenticated, userSession?.id, fetchUserProfile]
  );

  /**
   * Fetching User Profile on Authentication.
   */
  useEffect(() => {
    isAuthenticated && reloadUserProfile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      isUnauthenticated,
      userId: userSession?.id,
      user,
      orgId: userSession?.orgId,
      org,
      orgLink,

      /**
       * Force reload the User's profile data.
       */
      reloadUserProfile,
    }),
    [isLoading, isAuthenticated, isUnauthenticated, userSession, org, orgLink, user, reloadUserProfile]
  );
};

export default useAuth;
