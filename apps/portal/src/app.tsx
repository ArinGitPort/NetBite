import { PortalRouter } from "@/app/router/portal-router";
import { ThemeProvider } from "@/app/theme/theme-provider";

export { getNavigationForAccess } from "@/app/navigation";

export function App() {
  return <ThemeProvider><PortalRouter /></ThemeProvider>;
}
