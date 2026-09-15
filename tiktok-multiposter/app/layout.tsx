import "./globals.css";
import "./brand.css";
import "./login/auth-login.css";
import CreatorPromoEntry from "./components/CreatorPromoEntry";
import LocaleSelector from "./components/LocaleSelector";
import LocaleRuntime3 from "./components/LocaleRuntime3";
import LocaleCoverageFinal from "./components/LocaleCoverageFinal";
import LocaleResidualFix from "./components/LocaleResidualFix";
import LocaleCompletenessGuard from "./components/LocaleCompletenessGuard";

const appIcon = "/vyral-mark.svg";

export const metadata = {
  title: "VYRAL — Publicá una vez. Multiplicá tu alcance.",
  description: "Centralizá la publicación de contenido en múltiples cuentas desde un solo lugar.",
  icons: {
    icon: appIcon,
    shortcut: appIcon,
    apple: appIcon
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" dir="ltr">
      <body>
        <CreatorPromoEntry />
        <LocaleSelector />
        <LocaleRuntime3 />
        <LocaleCoverageFinal />
        <LocaleResidualFix />
        <LocaleCompletenessGuard />
        {children}
        <div className="vyralPersistentSignature" aria-hidden="true"><span>Powered by</span><strong>Tobias Carrizo</strong></div>
      </body>
    </html>
  );
}
