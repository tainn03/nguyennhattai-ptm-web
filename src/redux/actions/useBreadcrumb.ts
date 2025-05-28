import { APP_CLEAR_BREADCRUMB_ITEMS, APP_SET_BREADCRUMB_ITEMS } from "@/redux/types";
import { BreadcrumbItem } from "@/types";

import useDispatch from "./useDispatch";

const useBreadcrumb = () => {
  const dispatch = useDispatch();

  const setBreadcrumb = (payload: BreadcrumbItem[]) => {
    dispatch<BreadcrumbItem[]>({
      type: APP_SET_BREADCRUMB_ITEMS,
      payload,
    });
  };

  const clearBreadcrumb = () => {
    dispatch({ type: APP_CLEAR_BREADCRUMB_ITEMS });
  };

  return { setBreadcrumb, clearBreadcrumb };
};

export default useBreadcrumb;
