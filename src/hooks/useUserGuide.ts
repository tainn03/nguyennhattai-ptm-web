import { useCallback } from "react";

import { useDispatch } from "@/redux/actions";
import { useAppState } from "@/redux/states";
import { APP_UPDATE_USER_GUIDE_MODAL } from "@/redux/types";

export type UserGuideRequest = {
  targetPath: string;
  targetElement?: string | null;
  documentationLink?: string | null;
};

const useUserGuide = () => {
  const dispatch = useDispatch();
  const { userGuide } = useAppState();

  /**
   * Closes the user guide modal by dispatching an action to update the application state.
   */
  const closeUserGuide = useCallback(() => {
    dispatch({
      type: APP_UPDATE_USER_GUIDE_MODAL,
      payload: {
        open: false,
        targetPath: null,
        targetElement: null,
        documentationLink: null,
      },
    });
  }, [dispatch]);

  /**
   * Opens the user guide modal by fetching the user guide information and dispatching an action to update the application state.
   * @param {UserGuideRequest} param The user guide request object containing the target path and optional target element.
   */
  const openUserGuide = useCallback(
    async ({ targetPath, targetElement, documentationLink }: UserGuideRequest) => {
      dispatch({
        type: APP_UPDATE_USER_GUIDE_MODAL,
        payload: {
          open: true,
          targetPath,
          documentationLink,
          ...(targetElement && { targetElement }),
        },
      });
    },
    [dispatch]
  );

  return {
    open: userGuide.open || false,
    targetPath: userGuide.targetPath || null,
    targetElement: userGuide.targetElement || null,
    documentationLink: userGuide.documentationLink || null,
    closeUserGuide,
    openUserGuide,
  };
};

export default useUserGuide;
