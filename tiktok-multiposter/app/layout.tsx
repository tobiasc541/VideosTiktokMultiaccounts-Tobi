import "./globals.css";

const appIcon = "/ChatGPT%20Image%2013%20sept%202026%2C%2014_44_04%20(1).png";

export const metadata = {
  title: "TikTok Multi Poster",
  description: "Publicá un video en varias cuentas TikTok.",
  icons: {
    icon: appIcon,
    shortcut: appIcon,
    apple: appIcon
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
