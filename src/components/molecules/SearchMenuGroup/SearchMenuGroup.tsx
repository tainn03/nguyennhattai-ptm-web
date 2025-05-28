"use client";

import { Fragment, useCallback } from "react";

import { Badge, Link } from "@/components/atoms";
import { MenuItem } from "@/configs/menu";
import { usePermission } from "@/hooks";

type SearchMenuGroupProps = {
  title?: string;
  menus: MenuItem[];
};

const SearchMenuGroup = ({ title, menus }: SearchMenuGroupProps) => {
  const { hasPermission } = usePermission();

  const renderMenuItem = useCallback(
    (menu: MenuItem) =>
      menu.hidden ? null : (
        <Fragment key={`${menu.id}-${menu.name}`}>
          {(!menu.resource || !menu.action || hasPermission(menu.action, menu.resource)) && (
            <Link
              useDefaultStyle
              href={menu.link || "#"}
              className="flex gap-x-4 py-2 text-sm font-semibold leading-6 text-gray-900"
            >
              {menu.icon && <menu.icon className="h-6 w-6 flex-none text-gray-400" aria-hidden="true" />}
              <span>
                {menu.name}
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
          )}
        </Fragment>
      ),
    [hasPermission]
  );

  return (
    <>
      {menus.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase leading-6 text-gray-500">{title}&nbsp;</h3>
          <div className="mt-6 flow-root">
            <div className="-my-2">{menus.map(renderMenuItem)}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchMenuGroup;
