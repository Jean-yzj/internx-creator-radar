import "./globals.css";

export const metadata = {
  title: "InternX Creator Radar",
  description:
    "Internal BD tool for discovering IG and Threads career creators that fit InternX collaboration goals.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
