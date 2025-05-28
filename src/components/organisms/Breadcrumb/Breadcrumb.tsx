import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { HomeIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

import { Link } from "@/components/atoms";
import { BreadcrumbItem } from "@/types";

type BreadcrumbProps = {
  fullWidth?: boolean;
  showHome?: boolean;
  items: BreadcrumbItem[];
};

const Breadcrumb = ({ fullWidth = true, showHome = false, items }: BreadcrumbProps) => {
  if (!items.length) {
    return null;
  }

  return (
    <div
      className={clsx("border-b", {
        "mx-auto max-w-7xl": !fullWidth,
      })}
    >
      <nav className="flex overflow-x-auto px-4 py-3 sm:px-6 lg:px-8" aria-label="Breadcrumb">
        <ol role="list" className="flex items-center space-x-2 md:space-x-4">
          {showHome && (
            <li>
              <div>
                <Link
                  useDefaultStyle={false}
                  href="/"
                  className="flex flex-row items-center gap-x-2 whitespace-nowrap text-gray-400 hover:text-gray-500"
                >
                  <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="sr-only">Home</span>
                  <span className="text-sm font-medium text-gray-500 hover:text-gray-700">Bảng điều khiển</span>
                </Link>
              </div>
            </li>
          )}
          {items.map((item, index) => (
            <li key={item.name}>
              <div className="flex items-center">
                {(showHome || index > 0) && (
                  <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                )}
                {item.link ? (
                  <Link
                    useDefaultStyle={false}
                    href={item.link}
                    className={clsx("whitespace-nowrap text-sm text-gray-500 hover:text-gray-700", {
                      "ml-2 md:ml-4": showHome || index > 0,
                      "font-medium": index < items.length - 1,
                      "font-semibold": index === items.length - 1,
                    })}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <div
                    className={clsx("whitespace-nowrap text-sm text-gray-500", {
                      "ml-2 md:ml-4": showHome || index > 0,
                      "font-medium": index < items.length - 1,
                      "font-semibold": index === items.length - 1,
                    })}
                  >
                    {item.name}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
