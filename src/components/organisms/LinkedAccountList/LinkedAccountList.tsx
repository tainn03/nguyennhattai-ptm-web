"use client";

import { UserLinkedAccount, UserLinkedAccountProvider } from "@prisma/client";
import { useGoogleLogin } from "@react-oauth/google";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { LinkedAccountListItem } from "@/components/molecules";
import ConfirmModal from "@/components/organisms/ConfirmModal/ConfirmModal";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { checkEmailLinkedExists, createLinkedAccount, deleteLinkedAccount } from "@/services/client/user";
import { AnyObject } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { UserLinkedAccountProfile } from "@/types/auth";
import { post } from "@/utils/api";
import logger from "@/utils/logger";
import { ensureString } from "@/utils/string";

const LINKED_ACCOUNT_LIST: Partial<UserLinkedAccount>[] = [
  // { provider: UserLinkedAccountProvider.FACEBOOK }, // TODO
  { provider: UserLinkedAccountProvider.GOOGLE },
];

const LinkedAccountList = () => {
  const t = useTranslations();
  const { userId, user, reloadUserProfile } = useAuth();
  const [modalConfirm, setModalConfirm] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>();
  const [currentId, setCurrentId] = useState<number>();
  const [loading, setLoading] = useState<boolean>(false);
  const [linkedAccounts, setLinkedAccounts] = useState(LINKED_ACCOUNT_LIST);
  const { showNotification } = useNotification();

  /**
   * Handles the failure of linked account action.
   *
   * @param {AnyObject | undefined} err - An optional error object associated with the failure.
   */
  const handleLinkedAccountFail = useCallback(
    (err?: AnyObject, message?: string) => {
      setLoading(false);
      showNotification({
        color: "error",
        message: message || t("user_linked_account.link_error_message"),
      });
      err && logger.error(err);
    },
    [showNotification, t]
  );

  /**
   * Handle Google login and linked account action.
   *
   * @param {Object} onSuccess - Success callback function for the Google login.
   * @param {Object} onError - Error callback function for the Google login.
   * @param {string} flow - The flow of the Google login.
   */
  const handleLinkedGoogle = useGoogleLogin({
    onSuccess: async (response) => {
      const { status } = await post<ApiResult>("/api/users/linked-account", { userId, code: response.code });
      if (status === HttpStatusCode.Conflict) {
        handleLinkedAccountFail(undefined, t("user_linked_account.link_another_account_google"));
        return;
      }

      if (status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          message: t("user_linked_account.link_success_message_google"),
        });
        reloadUserProfile();
        return;
      }

      handleLinkedAccountFail();
    },
    onNonOAuthError: () => setLoading(false),
    onError: (error) => handleLinkedAccountFail(error),
    flow: "auth-code",
  });

  /**
   * Handles the linked account action.
   *
   * @param {UserLinkedAccountProfile | undefined} userInfo - User linked account information.
   * @param {number | undefined} linkedAccountId - Linked account ID (if available).
   * @param {string | undefined} provider - The provider of the linked account.
   */
  const handleLinkedAccount = useCallback(
    async (userInfo?: UserLinkedAccountProfile, linkedAccountId?: number, provider?: UserLinkedAccountProvider) => {
      setCurrentProvider(provider);
      if (linkedAccountId) {
        setCurrentId(linkedAccountId);
        setModalConfirm(true);
        return;
      }

      setLoading(true);
      if (provider === "GOOGLE") {
        handleLinkedGoogle();
        return;
      }

      const isExistLinkedEmail = await checkEmailLinkedExists(
        ensureString(userInfo?.email),
        UserLinkedAccountProvider.FACEBOOK
      );
      if (isExistLinkedEmail) {
        handleLinkedAccountFail(undefined, t("user_linked_account.link_another_account_facebook"));
        setLoading(false);
        return;
      }

      const userLinkedId = await createLinkedAccount(
        Number(userId),
        ensureString(userInfo?.email),
        userInfo?.picture?.data.url || "",
        ensureString(userInfo?.id),
        UserLinkedAccountProvider.FACEBOOK
      );

      if (userLinkedId) {
        showNotification({
          color: "success",
          message: t("user_linked_account.link_success_message_facebook"),
        });
        reloadUserProfile();
        return;
      }

      handleLinkedAccountFail();
    },
    [handleLinkedAccountFail, handleLinkedGoogle, reloadUserProfile, showNotification, t, userId]
  );

  /**
   * Handles the unlinking of a user account from a provider.
   */
  const handleUnLinkedAccount = useCallback(async () => {
    setLoading(true);
    setModalConfirm(false);
    const isDeleteSuccess = await deleteLinkedAccount(Number(currentId));

    let message = t("user_linked_account.unlink_error_message", { account: currentProvider });
    if (isDeleteSuccess) {
      message = t("user_linked_account.unlink_success_message", { account: currentProvider });
      reloadUserProfile();
    }

    showNotification({
      color: isDeleteSuccess ? "success" : "error",
      message,
    });
    setLoading(false);
  }, [currentId, currentProvider, reloadUserProfile, showNotification, t]);

  useEffect(() => {
    const linkedList = LINKED_ACCOUNT_LIST.map((item) => {
      const userLinkedAccount = user?.linkedAccounts?.find((linkedAccount) => linkedAccount.provider === item.provider);
      return { ...item, ...userLinkedAccount };
    });
    setLinkedAccounts(linkedList);
    setLoading(false);
  }, [user?.linkedAccounts]);

  /**
   * Closes the modal dialog.
   */
  const handleCloseModal = useCallback(() => {
    setModalConfirm(false);
  }, []);

  return (
    <>
      <ul role="list" className="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
        {linkedAccounts.map((item) => (
          <LinkedAccountListItem
            key={item.provider}
            linkedAccount={item}
            onLinkedAccount={handleLinkedAccount}
            loading={loading && currentProvider === item.provider}
          />
        ))}
      </ul>

      <ConfirmModal
        icon="warning"
        open={modalConfirm}
        title={t("user_linked_account.unlink_confirm_title")}
        message={t("user_linked_account.unlink_confirm_message", { account: currentProvider })}
        //currentProvider
        onClose={handleCloseModal}
        onCancel={handleCloseModal}
        onConfirm={handleUnLinkedAccount}
      />
    </>
  );
};

export default LinkedAccountList;
