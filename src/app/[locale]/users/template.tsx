"use client";

import { useEffect, useState } from "react";

import { Loading } from "@/components/molecules";
import { Breadcrumb, Header, Sidebar } from "@/components/organisms";
import { useAuth } from "@/hooks";
import { useBreadcrumb } from "@/redux/actions";
import { useAppState } from "@/redux/states";
import { DefaultReactProps } from "@/types";

export default function Template({ children }: DefaultReactProps) {
  const { clearBreadcrumb } = useBreadcrumb();
  const { breadcrumbItems } = useAppState();
  const { isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    return () => {
      clearBreadcrumb();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <Loading fullScreen size="large" />;
  }

  return (
    <div>
      <Sidebar scope="user" sidebarOpen={sidebarOpen} onSidebarOpen={setSidebarOpen} />

      <div className="transition-all xl:pl-72">
        <Header onSidebarOpen={setSidebarOpen} />
        <Breadcrumb items={breadcrumbItems} />

        <main className="py-10">
          <div className="mx-auto sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
