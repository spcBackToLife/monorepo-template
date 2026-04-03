import { createContext, useContext } from 'react';
import type { DataContext } from './resolveExpression';

const DataContextReact = createContext<DataContext>({ data: {} });

export const DataContextProvider = DataContextReact.Provider;

export function useDataContext(): DataContext {
  return useContext(DataContextReact);
}
