"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { Logo } from "@/components/atoms";

import { InitializeData, NewAccountForm, ProgressBar } from "./components";

const steps = ["Create an administrator account", "Initialize master data"];

export default function Page() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Auto redirect to login page after init successful
    if (stepIndex >= 2) {
      setTimeout(async () => {
        await signOut({ redirect: false });
        router.replace("/auth/signin");
      }, 5 * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const handleNextStep = useCallback(() => {
    setStepIndex((prevValue) => prevValue + 1);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col py-6 lg:py-12">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="md:mx-auto md:w-full md:max-w-sm">
          <div className="flex justify-center">
            <Logo size="large" />
          </div>
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Welcome to AUTOTMS!
          </h2>
          <div className="mt-2 text-center text-sm leading-6 text-gray-500">
            Initialize the administrator account and master data to start using the features of AUTOTMS.
          </div>
        </div>

        <div className="mt-10 md:mx-auto md:w-full md:max-w-lg">
          <ProgressBar steps={steps} stepIndex={stepIndex} />
        </div>

        {/* Create new account */}
        {stepIndex === 0 && (
          <div className="mt-10 md:mx-auto md:w-full md:max-w-sm">
            <NewAccountForm onSuccess={handleNextStep} />
          </div>
        )}

        {/* Initial data */}
        {stepIndex >= 1 && (
          <div className="mt-20 md:mx-auto md:w-full md:max-w-sm">
            <InitializeData onSuccess={handleNextStep} />
          </div>
        )}
      </div>
    </div>
  );
}
