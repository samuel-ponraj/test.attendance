"use client";

import { createContext, useContext, useState } from "react";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [isAddTeamOpen, setAddTeamOpen] = useState(false);

  return (
    <UIContext.Provider
      value={{ isAddTeamOpen, setAddTeamOpen }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }

  return context;
};
