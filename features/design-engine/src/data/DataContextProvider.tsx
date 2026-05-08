import { createContext, useContext } from 'react';
import type { DataContext } from './dataContext';

const DataContextReact = createContext<DataContext>({ state: { data: {}, view: {}, effects: {} } });

export const DataContextProvider = DataContextReact.Provider;

export function useDataContext(): DataContext {
  return useContext(DataContextReact);
}
