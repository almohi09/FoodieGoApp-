import { AppDispatch, RootState, useStore } from '../store';

export const useAppDispatch = (): AppDispatch =>
  useStore(state => state.dispatch);

export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useStore(state => selector(state));

