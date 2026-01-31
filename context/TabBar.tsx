import React, { createContext, useContext, useMemo, useState } from "react";

interface TabBarContextType {
  hidden: boolean;
  hideTabBar: () => void;
  showTabBar: () => void;
  toggleTabBar: () => void;
}

const TabBarContext = createContext<TabBarContextType | null>(null);

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  const api = useMemo(
    () => ({
      hidden,
      hideTabBar: () => setHidden(true),
      showTabBar: () => setHidden(false),
      toggleTabBar: () => setHidden((p) => !p),
    }),
    [hidden]
  );

  return (
    <TabBarContext.Provider value={api}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  const ctx = useContext(TabBarContext);
  if (!ctx) {
    throw new Error("useTabBar must be used inside TabBarProvider");
  }
  return ctx;
}