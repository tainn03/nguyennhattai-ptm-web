"use client";

import { Provider as JotaiProvider } from "jotai";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { usePathname, useRouter } from "next-intl/client";
import NextTopLoader from "nextjs-toploader";
import NProgress from "nprogress";
import { useEffect } from "react";
import { Provider as ReactReduxProvider } from "react-redux";
import { Tooltip } from "react-tooltip";

import useStore from "@/redux/store";
import { DefaultReactProps } from "@/types";

type RootProviderProps = DefaultReactProps & {
  session?: Session | null;
};

export default function RootProvider({ children, session }: RootProviderProps) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Resolved for issue "NextTopLoader stopped working on Nextjs 14.0.3"
   *
   * @see https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1819837995
   */
  useEffect(() => {
    NProgress.done();
  }, [pathname, router]);

  return (
    <JotaiProvider>
      <SessionProvider session={session}>
        <ReactReduxProvider store={store}>{children}</ReactReduxProvider>

        {/* Progress loader on the top page */}
        <NextTopLoader
          color="#0070E0"
          shadow="0 0 10px #0070E0, 0 0 5px #0070E0"
          initialPosition={0.3}
          showSpinner={false}
        />

        {/* Tooltip */}
        <Tooltip id="tooltip" className="z-[9999]" />
      </SessionProvider>
    </JotaiProvider>
  );
}
