import "./globals.css";
import "./login/auth-login.css";
import CreatorPromoEntry from "./components/CreatorPromoEntry";

const appIcon = "/ChatGPT%20Image%2013%20sept%202026%2C%2014_44_04%20(1).png";

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
      <body><CreatorPromoEntry />{children}</body>
    </html>
  );
}
