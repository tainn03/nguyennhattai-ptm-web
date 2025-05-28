import clsx from "clsx";
import { ElementType, useCallback } from "react";

import { Badge } from "@/components/atoms";

export type TabItem = {
  value: string;
  label: string;
  icon?: ElementType;
  badge?: string;
};

type TabsProps = {
  items: TabItem[];
  selectedTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
};

export const Tabs = ({ items, selectedTab, onTabChange, className }: TabsProps) => {
  const handleButtonClick = useCallback(
    (value: string) => () => {
      onTabChange && onTabChange(value);
    },
    [onTabChange]
  );

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedTab = items.find((tab) => tab.value === event.target.value);
      if (selectedTab) {
        onTabChange && onTabChange(selectedTab.value);
      }
    },
    [items, onTabChange]
  );

  return (
    <div className={className}>
      <div className="px-4 sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          onChange={handleSelectChange}
          value={selectedTab}
          className="block w-full rounded-md border border-gray-300 py-1.5 pl-3 pr-10 text-sm focus:border-blue-700 focus:outline-none focus:ring-blue-700"
        >
          {items.map((tab) => (
            <option key={`tab_item_${tab.value}`} value={tab.value}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="-mx-4 -mt-4 border-b border-gray-200 px-4 sm:-mx-6 sm:px-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {items.map((tab) => (
              <button
                key={`tab_item_${tab.value}`}
                type="button"
                onClick={handleButtonClick(tab.value)}
                className={clsx(
                  "group inline-flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium",
                  {
                    "border-blue-700 text-blue-700": selectedTab === tab.value,
                    "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700":
                      selectedTab !== tab.value,
                  }
                )}
              >
                {tab.icon && (
                  <tab.icon
                    className={clsx("-ml-0.5 mr-2 h-5 w-5", {
                      "text-blue-700": tab.value === selectedTab,
                      "text-gray-400 group-hover:text-gray-500": tab.value !== selectedTab,
                    })}
                    aria-hidden="true"
                  />
                )}
                {tab.label}
                {tab.badge && (
                  <Badge
                    color={tab.value === selectedTab ? "primary" : "secondary"}
                    className="ml-2"
                    label={tab.badge}
                    rounded
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Tabs;
