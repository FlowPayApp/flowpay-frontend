import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import Landing from "./pages/Landing";
import { ThemeProvider } from "./theme";

export { SEO_DESCRIPTION, SEO_TITLE, SITE_URL, structuredData } from "./pages/landingContent";

export function render() {
  return renderToString(
    <StaticRouter location="/">
      <ThemeProvider>
        <Landing />
      </ThemeProvider>
    </StaticRouter>,
  );
}
