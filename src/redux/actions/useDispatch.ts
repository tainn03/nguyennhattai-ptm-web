/* eslint-disable @typescript-eslint/no-explicit-any */
import { useDispatch as useReactReduxDispatch } from "react-redux";
import { AnyAction } from "redux";

export type Action<P = any> = AnyAction & {
  payload?: P;
};

export type Dispatch = <P = any>(action: Action<P>) => void;

const useDispatch = (): Dispatch => {
  const dispatch = useReactReduxDispatch();
  return dispatch;
};

export default useDispatch;
