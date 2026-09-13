import "./globals.css";

export const metadata = {
  title: "TikTok Multi Poster",
  description: "Publicá un video en varias cuentas TikTok."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
