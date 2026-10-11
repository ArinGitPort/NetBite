import { createContext, useContext, useLayoutEffect } from "react";

export interface PortalPageHeading {
  label: string;
  title: string;
  description: string;
}

export const PortalPageHeadingContext = createContext<{
  register: (heading: PortalPageHeading) => () => void;
} | null>(null);

export function usePortalPageHeading(heading: PortalPageHeading) {
  const context = useContext(PortalPageHeadingContext);
  const register = context?.register;

  useLayoutEffect(() => {
    if (!register) return;
    return register(heading);
  }, [register, heading.label, heading.title, heading.description]);

  return Boolean(context);
}
