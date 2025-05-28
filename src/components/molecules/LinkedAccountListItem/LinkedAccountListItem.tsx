// import FacebookLogin, { FailResponse } from "@greatsumini/react-facebook-login"; // TODO
import { UserLinkedAccount, UserLinkedAccountProvider, UserSetting } from "@prisma/client";
import { useTranslations } from "next-intl";
import React, { useCallback, useMemo } from "react";
// import { FaFacebook as FacebookIcon, FaGoogle as GoogleIcon } from "react-icons/fa" // TODO
import { FaGoogle as GoogleIcon } from "react-icons/fa";

import { DateTimeLabel } from "@/components/atoms";
import Button from "@/components/molecules/Button/Button";
// import { NEXT_PUBLIC_FACEBOOK_CLIENT_ID } from "@/configs/environment"; // TODO
// import { NEXT_PUBLIC_FACEBOOK_CLIENT_ID } from "@/configs/environment"; // TODO
// import { useNotification } from "@/redux/actions"; // TODO
import { UserLinkedAccountProfile } from "@/types/auth";
// import logger from "@/utils/logger"; // TODO

type LinkedAccountListItemProps = {
  linkedAccount: Partial<UserLinkedAccount & UserSetting>;
  loading: boolean;
  onLinkedAccount: (
    userInfo?: UserLinkedAccountProfile,
    linkedAccountId?: number,
    provider?: UserLinkedAccountProvider
  ) => void;
};

const LinkedAccountListItem = ({ loading, linkedAccount, onLinkedAccount }: LinkedAccountListItemProps) => {
  const t = useTranslations();
  // const { showNotification } = useNotification(); // TODO
  const isLinked = useMemo(() => linkedAccount.id, [linkedAccount.id]);

  /**
   * Handles the linked account action.
   *
   * @param {UserLinkedAccountProfile | undefined} userInfo - User linked account information.
   */
  const handleLinkedAccount = useCallback(
    (userInfo?: UserLinkedAccountProfile) => onLinkedAccount(userInfo, linkedAccount?.id, linkedAccount.provider),
    [linkedAccount.id, linkedAccount.provider, onLinkedAccount]
  );

  // TODO
  // /**
  //  * Handles the Facebook login failure.
  //  *
  //  * @param {AnyObject} err - The error object associated with the login failure.
  //  */
  // const handleFacebookLoginFail = useCallback(
  //   (err: FailResponse) => {
  //     if (err.status !== "loginCancelled") {
  //       showNotification({
  //         color: "error",
  //         message: t("user_linked_account.link_error_message"),
  //       });
  //       logger.error(err);
  //     }
  //   },
  //   [showNotification, t]
  // );

  return (
    <li className="flex items-center justify-between gap-x-4 py-6">
      <div className="group block">
        <div className="flex items-center justify-center text-left">
          <div className="flex-shrink-0">
            {/* // TODO */}
            {/* {linkedAccount.provider === "FACEBOOK" && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 ring-8 ring-white">
                <FacebookIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
            )} */}
            {linkedAccount.provider === "GOOGLE" && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 ring-8 ring-white">
                <GoogleIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{linkedAccount.provider}</p>
            <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
              {isLinked ? (
                <>
                  {linkedAccount.email ?? linkedAccount.userId} -{" "}
                  <DateTimeLabel type="datetime" value={linkedAccount.createdAt} />
                </>
              ) : (
                <>{t("user_linked_account.not_linked")}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {isLinked ? (
        <Button size="small" onClick={() => handleLinkedAccount()} color="error" loading={loading}>
          {t("user_linked_account.unlink")}
        </Button>
      ) : linkedAccount.provider === "FACEBOOK" ? (
        // TODO
        // <FacebookLogin
        //   appId={NEXT_PUBLIC_FACEBOOK_CLIENT_ID}
        //   onFail={handleFacebookLoginFail}
        //   onProfileSuccess={handleLinkedAccount}
        //   render={({ onClick }) => (
        //     <Button size="small" onClick={onClick} color="primary" loading={loading}>
        //       {t("user_linked_account.link")}
        //     </Button>
        //   )}
        // />
        <></>
      ) : (
        <Button size="small" onClick={() => handleLinkedAccount()} color="primary" loading={loading}>
          {t("user_linked_account.link")}
        </Button>
      )}
    </li>
  );
};

export default LinkedAccountListItem;
