"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import { useCallback } from "react";

import { Logo } from "@/components/atoms";
import { NotificationMenu } from "@/components/molecules";
import { AvatarMenu, SearchMenu } from "@/components/organisms";
import { useAuth } from "@/hooks";

export type HeaderProps = {
  searchBar?: boolean;
  sidebarMenu?: boolean;
  onSidebarOpen?: (_value: boolean) => void;
};

const Header = ({ searchBar = true, sidebarMenu = true, onSidebarOpen }: HeaderProps) => {
  const { user } = useAuth(false);

  const handleSidebarOpen = useCallback(() => {
    onSidebarOpen && onSidebarOpen(true);
  }, [onSidebarOpen]);

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {sidebarMenu ? (
        <button type="button" className="-m-2.5 p-2.5 text-gray-700 xl:hidden" onClick={handleSidebarOpen}>
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      ) : (
        <div className="-m-2.5 inline-flex p-2.5">
          <Logo size="small" />
        </div>
      )}

      {/* Separator */}
      {/* <div className="h-6 w-px bg-gray-900/10 xl:hidden" aria-hidden="true" /> */}

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex-1">{searchBar && <SearchMenu />}</div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* <LocaleSwitcher /> */}
          {user && (
            <>
              {/* Notification menu */}
              <NotificationMenu />

              {/* Separator */}
              {/* <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" /> */}

              {/* Profile dropdown */}
              <AvatarMenu />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
