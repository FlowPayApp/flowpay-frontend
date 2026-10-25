import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCompanyChannels } from "../api";
import { getSessionClaims, useAuthToken } from "./auth";

export type CompanyChannelsState = {
  email: boolean;
  whatsapp: boolean;
  ready: boolean;
};

const OPEN: CompanyChannelsState = { email: true, whatsapp: true, ready: true };
const PENDING: CompanyChannelsState = { email: false, whatsapp: false, ready: false };

const CompanyChannelsContext = createContext<CompanyChannelsState>(PENDING);

export function CompanyChannelsProvider({ children }: { children: ReactNode }) {
  const token = useAuthToken();
  const role = getSessionClaims()?.role ?? "";
  const forCompany = !!token && role !== "platform_admin";
  const [state, setState] = useState<CompanyChannelsState>(forCompany ? PENDING : OPEN);

  useEffect(() => {
    if (!forCompany) {
      setState(OPEN);
      return;
    }
    let active = true;
    setState(PENDING);
    void fetchCompanyChannels()
      .then((data) => {
        if (!active) return;
        setState({ email: data.email, whatsapp: data.whatsapp, ready: true });
      })
      .catch(() => {
        if (active) setState(OPEN);
      });
    return () => {
      active = false;
    };
  }, [forCompany, token]);

  return <CompanyChannelsContext.Provider value={state}>{children}</CompanyChannelsContext.Provider>;
}

export function useCompanyChannels() {
  return useContext(CompanyChannelsContext);
}
