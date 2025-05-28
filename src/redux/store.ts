import { configureStore } from "@reduxjs/toolkit";
import { useMemo } from "react";
import thunk from "redux-thunk";

import { __DEV__ } from "@/configs/environment";

import reducers, { State } from "./reducers";

const createStore = (preloadedState?: State) => {
  return configureStore({
    reducer: reducers,
    devTools: __DEV__,
    middleware: [thunk],
    preloadedState,
  });
};

let store: ReturnType<typeof createStore> | undefined;

const initializeStore = (preloadedState?: State) => {
  let myStore = store ?? createStore(preloadedState);

  // After navigating to a page with an initial Redux state, merge that state
  // with the current state in the store, and create a new store
  if (preloadedState && store) {
    myStore = createStore({
      ...store.getState(),
      ...preloadedState,
    });

    // Reset the current store
    store = undefined;
  }

  // For SSG and SSR always create a new store
  if (typeof window === "undefined") {
    return myStore;
  }

  // Create the store once in the client
  if (!store) {
    store = myStore;
  }

  return myStore;
};

const useStore = (initialState?: State) => useMemo(() => initializeStore(initialState), [initialState]);

export default useStore;
