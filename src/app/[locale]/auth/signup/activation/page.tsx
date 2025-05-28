"use client";

import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useRef, useState } from "react";

import { Link, Spinner } from "@/components/atoms";
import { Button, ForgotPasswordLayout } from "@/components/molecules";
import { AlertModal } from "@/components/organisms";
import { useAuth } from "@/hooks";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";
import { countdown } from "@/utils/date";

/** 30 second */
const AUTO_REDIRECT_TIMEOUT_SECONDS = 30;

type ActiveStatus = "ACTIVATING" | "INVALID" | "EXPIRED" | "SUCCESS";

export default function Page() {
  const t = useTranslations("sign_up");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { isUnauthenticated } = useAuth(false);

  const [activeStatus, setActiveStatus] = useState<ActiveStatus>("ACTIVATING");
  const [isLoading, setIsLoading] = useState(false);
  const [isReactiveAlertOpen, setIsReactiveAlertOpen] = useState(false);
  const [reactiveSuccess, setReactiveSuccess] = useState(false);
  const [seconds, setSeconds] = useState<number>(0);

  const intervalId = useRef<NodeJS.Timeout>();

  /**
   * Navigate to the sign-in page ("/auth/signin").
   *
   * @returns {void}
   */
  const goSignIn = useCallback(() => {
    return router.replace("/auth/signin");
  }, [router]);

  useEffect(() => {
    if (!token) {
      return goSignIn();
    }

    return () => {
      clearInterval(intervalId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Countdown timer for auto redirection to the sign-in page after a specified timeout.
   */
  const startCountdownTimer = useCallback(() => {
    setSeconds(AUTO_REDIRECT_TIMEOUT_SECONDS);
    intervalId.current = setInterval(() => {
      setSeconds((prevValue) => {
        const newValue = prevValue - 1;
        if (newValue === 0) {
          clearInterval(intervalId.current);
          goSignIn();
        }
        return newValue;
      });
    }, 1000);
  }, [goSignIn]);

  /**
   * Sends a request to the server to request reactivate of the user using the provided activation token.
   *
   * @returns {Promise<void>} A Promise that resolves once the re-activation process is completed.
   */
  const handleReactive = useCallback(async () => {
    setIsLoading(true);
    const { status } = await post<ApiResult>("/api/auth/signup/activation", {
      token,
      reActive: true,
    });
    setReactiveSuccess(status === HttpStatusCode.Ok);
    setIsReactiveAlertOpen(true);
    setIsLoading(false);
  }, [token]);

  /**
   * Handling the confirmation of a user's reactivation attempt.
   * It closes the reactivation alert and, if the reactivation was successful, navigates the user to the sign-in page.
   */
  const handleReactiveConfirm = useCallback(() => {
    setIsReactiveAlertOpen(false);
    if (reactiveSuccess) {
      goSignIn();
    }
  }, [goSignIn, reactiveSuccess]);

  /**
   * Confirming a new user's signup by sending an activation token to the server.
   *
   * @param {string} token - The activation token sent to the server for confirmation.
   * @returns {Promise<void>} A Promise that resolves once the confirmation process is completed.
   */
  const activationUser = useCallback(
    async (token: string) => {
      const { status } = await post<ApiResult>("/api/auth/signup/activation", { token });
      // Token is invalid or not exists
      if (status === HttpStatusCode.BadRequest) {
        setActiveStatus("INVALID");
        return;
      }

      // Token is expired
      if (status === HttpStatusCode.RequestTimeout) {
        setActiveStatus("EXPIRED");
        return;
      }

      // Activation successful, set the active status to "SUCCESS" and start countdown timer
      setActiveStatus("SUCCESS");
      startCountdownTimer();
    },
    [startCountdownTimer]
  );

  useEffect(
    () => {
      if (token && isUnauthenticated) {
        activationUser(token);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isUnauthenticated]
  );

  return (
    <>
      <ForgotPasswordLayout
        title={t("activation.title")}
        description={t("activation.description")}
        actionComponent={
          <>
            {seconds > 0 &&
              t.rich("activation.auto_redirect_to_login", {
                click: (chunks) => (
                  <Link useDefaultStyle href="/auth/signin">
                    {chunks}
                  </Link>
                ),
                seconds: countdown(seconds),
              })}
          </>
        }
        showCancel={false}
      >
        <div className="flex min-h-[80px] flex-col items-center justify-center gap-6">
          {/* Loading */}
          {activeStatus === "ACTIVATING" && (
            <>
              <Spinner className="!h-16 !w-16 border-[5px]" />
              <span className="text-center text-sm">{t("activation.activating")}</span>
            </>
          )}

          {/* Invalid */}
          {activeStatus === "INVALID" && (
            <>
              <XCircleIcon className="h-20 w-20 text-red-600" aria-hidden="true" />
              <span className="text-center text-sm">{t("activation.token_error_invalid")}</span>
            </>
          )}

          {/* Expired */}
          {activeStatus === "EXPIRED" && (
            <>
              <XCircleIcon className="h-20 w-20 text-red-600" aria-hidden="true" />
              <span className="text-center text-sm">{t("activation.token_error_expired")}</span>
              <Button onClick={handleReactive} loading={isLoading}>
                {t("activation.click_to_resend_active")}
              </Button>
            </>
          )}

          {/* Expired */}
          {activeStatus === "SUCCESS" && (
            <>
              <CheckCircleIcon className="h-20 w-20 text-green-600" aria-hidden="true" />
              <span className="text-center text-sm">{t("activation.activation_success_message")}</span>
            </>
          )}
        </div>
      </ForgotPasswordLayout>

      <AlertModal
        open={isReactiveAlertOpen}
        icon={reactiveSuccess ? "success" : "error"}
        title={reactiveSuccess ? t("activation.send_success_title") : t("activation.send_error_title")}
        message={reactiveSuccess ? t("activation.send_success_message") : t("activation.send_error_message")}
        onConfirm={handleReactiveConfirm}
      />
    </>
  );
}
