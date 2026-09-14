import "./globals.css";
import "./brand.css";
import "./login/auth-login.css";
import CreatorPromoEntry from "./components/CreatorPromoEntry";
import LocaleController from "./components/LocaleController";
import LocaleIntegrityGuard from "./components/LocaleIntegrityGuard";

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
    <html lang="es">
      <body>
        <CreatorPromoEntry />
        <LocaleController />
        <LocaleIntegrityGuard />
        {children}
        <div className="vyralPersistentSignature" aria-hidden="true"><span>Powered by</span><strong>Tobias Carrizo</strong></div>
      </body>
    </html>
  );
}
