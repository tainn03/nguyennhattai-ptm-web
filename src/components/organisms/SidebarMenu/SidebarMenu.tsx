"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { usePathname } from "next-intl/client";
import { Fragment, useCallback, useMemo } from "react";

import { Badge, Link } from "@/components/atoms";
import { MenuGroup, MenuItem } from "@/configs/menu";
import { useAuth, usePermission } from "@/hooks";

export type SidebarMenuProps = {
  menuGroup: MenuGroup;
};

const SidebarMenu = ({ menuGroup }: SidebarMenuProps) => {
  const t = useTranslations();
  const { org } = useAuth();
  const pathname = usePathname();
  const { hasPermission } = usePermission();

  const isPermitted = useMemo(
    () => menuGroup.menus.some((menu) => !menu.resource || !menu.action || hasPermission(menu.action, menu.resource)),
    [hasPermission, menuGroup.menus]
  );

  const isCurrentMenu = useCallback((link?: string) => link === pathname, [pathname]);

  const renderMenuItem = useCallback(
    (menu: MenuItem) =>
      menu.hidden ? null : (
        <Fragment key={menu.id}>
          {(!menu.resource || !menu.action || hasPermission(menu.action, menu.resource)) && (
            <li>
              <Link
                useDefaultStyle={false}
                href={
                  menu.id === "81o0mfmil8c7" && pathname.includes("/workflows")
                    ? `/orgs/${org?.code}/settings/workflows`
                    : menu.link || "#"
                }
                className={clsx("group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6", {
                  "bg-gray-800 text-white": isCurrentMenu(menu.link),
                  "text-gray-400 hover:bg-gray-800 hover:text-white": !isCurrentMenu(menu.link),
                })}
              >
                {menu.icon && <menu.icon className="h-6 w-6 shrink-0" aria-hidden="true" />}
                <span>
                  {menu.id === "81o0mfmil8c7" && pathname.includes("/workflows")
                    ? "Quy trình"
                    : menu.process === "finished"
                    ? t(menu.name)
                    : menu.name}

                  {menu.badge && <Badge color="success" className="ml-2 bg-transparent" label={menu.badge} />}
                  {/* {menu.process && (
                  <CheckBadgeIcon
                    className={clsx("ml-2 inline-flex h-6 w-6", {
                      "text-yellow-600": menu.process === "merged",
                      "text-green-600": menu.process === "finished",
                    })}
                    aria-hidden="true"
                  />
                )} */}
                </span>
              </Link>
            </li>
          )}
        </Fragment>
      ),
    [hasPermission, isCurrentMenu, org?.code, pathname, t]
  );

  if (!isPermitted) {
    return null;
  }

  return (
    <li key={menuGroup.id}>
      {menuGroup.header && <div className="text-xs font-semibold leading-6 text-gray-400">{t(menuGroup.header)}</div>}
      <ul role="list" className="-mx-2 mt-2 space-y-1">
        {menuGroup.menus.map(renderMenuItem)}
      </ul>
    </li>
  );
};

export default SidebarMenu;
