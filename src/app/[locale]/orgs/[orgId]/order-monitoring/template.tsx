"use client";

import { useEffect, useState } from "react";

import { Breadcrumb, Header, Sidebar } from "@/components/organisms";
import { useBreadcrumb } from "@/redux/actions";
import { useAppState } from "@/redux/states";
import { DefaultReactProps } from "@/types";

export default function Template({ children }: DefaultReactProps) {
  const { clearBreadcrumb } = useBreadcrumb();
  const { breadcrumbItems } = useAppState();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    return () => {
      clearBreadcrumb();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full">
      <Sidebar scope="organization" sidebarOpen={sidebarOpen} onSidebarOpen={setSidebarOpen} />

      <div className="h-full transition-all xl:pl-72">
        <Header onSidebarOpen={setSidebarOpen} />
        <Breadcrumb items={breadcrumbItems} />

        <main className="py-10">
          <div className="mx-auto sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
