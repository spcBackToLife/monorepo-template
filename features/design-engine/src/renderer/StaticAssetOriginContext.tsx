import React, { createContext, useContext } from 'react';

const Ctx = createContext<string | undefined>(undefined);

export function StaticAssetOriginProvider({
  origin,
  children,
}: {
  origin: string | undefined;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={origin}>{children}</Ctx.Provider>;
}

export function useStaticAssetOrigin(): string | undefined {
  return useContext(Ctx);
}
