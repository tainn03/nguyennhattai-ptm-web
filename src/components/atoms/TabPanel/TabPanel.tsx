import { Fragment } from "react";

import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { DefaultReactProps } from "@/types";

export type TabPanelProps = DefaultReactProps & {
  item: TabItem;
  selectedTab?: string;
  className?: string;
};

export const TabPanel = ({ item, selectedTab, ...otherProps }: TabPanelProps) => {
  return <>{item.value === selectedTab && <Fragment {...otherProps} />}</>;
};

export default TabPanel;
