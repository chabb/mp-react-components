import * as React from 'react';
import { Dispatch, useMemo, useReducer } from 'react';
import {
  CameraActionPayload,
  cameraReducer,
  CameraReducerAction,
  CameraState,
  initialState
} from './camera-reducer';
import { Action } from './utils';

export interface ICameraContext {
  state: CameraState | null;
  dispatch: Dispatch<Action<CameraReducerAction, CameraActionPayload>> | null;
}
export const CameraContext = React.createContext<ICameraContext>({
  state: null,
  dispatch: null
});

/**
 *
 * Use CameraContextWrapper to coordinate multiple 3D Scene
 *
 */
export function CameraContextWrapper(props: any) {
  // type of dispatch is React.Dispatch<Action<CameraActionType, CameraActionPayload>>
  const [state, dispatch] = useReducer(cameraReducer, initialState);
  const store = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <CameraContext.Provider value={store}>{{ ...props.children }}</CameraContext.Provider>;
}
