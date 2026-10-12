import React, { createContext, useContext, useState } from "react";
import { Channel } from "../../../types";

type PanelContextType = {
  selected: Channel | null;
  setSelected: (ch: Channel) => void;
  highlighted: any;
  setHighlighted: (item: any) => void;
};

const PanelContext = createContext<PanelContextType | null>(null);

export const PanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<Channel | null>(null);
  const [highlighted, setHighlighted] = useState<any>(null);

  return (
    <PanelContext.Provider value={{ selected, setSelected, highlighted, setHighlighted }}>
      {children}
    </PanelContext.Provider>
  );
};

export const usePanel = () => {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel must be used inside <PanelProvider>");
  return ctx;
};
