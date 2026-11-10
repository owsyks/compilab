"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { defaultPreferences, Preferences } from "@/lib/client";
type Context = {
  preferences: Preferences;
  setPreferences: (p: Partial<Preferences>) => void;
  t: (fr: string, en: string) => string;
};
const UIContext = createContext<Context>({
  preferences: defaultPreferences,
  setPreferences: () => {},
  t: (fr) => fr,
});
export function Providers({ children }: { children: ReactNode }) {
  const [preferences, setState] = useState(defaultPreferences);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("compilab-preferences");
      if (saved) setState({ ...defaultPreferences, ...JSON.parse(saved) });
    } catch {
      /* restricted storage uses defaults */
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.lang = preferences.language;
    document.documentElement.dataset.motion = preferences.reducedMotion
      ? "reduced"
      : "normal";
  }, [preferences]);
  const setPreferences = (p: Partial<Preferences>) =>
    setState((old) => {
      const next = { ...old, ...p };
      try {
        localStorage.setItem("compilab-preferences", JSON.stringify(next));
      } catch {}
      return next;
    });
  return (
    <UIContext.Provider
      value={{
        preferences,
        setPreferences,
        t: (fr, en) => (preferences.language === "fr" ? fr : en),
      }}
    >
      {children}
    </UIContext.Provider>
  );
}
export const useUI = () => useContext(UIContext);
