import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "8 Bishopsgate · Security Operations",
  description:
    "Task management and communications platform for security operations at 8 Bishopsgate, London.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="8B SecOps" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
        {/* Global capture deterrence: blurs content on PrintScreen and
            discourages screenshots of protected media (policy banner shown in-app). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('keyup', function (e) {
                if (e.key === 'PrintScreen') {
                  document.body.style.filter = 'blur(18px)';
                  setTimeout(function () { document.body.style.filter = ''; }, 1500);
                  if (navigator.clipboard) navigator.clipboard.writeText('Screenshots not authorised - 8 Bishopsgate security policy').catch(function(){});
                }
              });
              document.addEventListener('contextmenu', function (e) {
                if (e.target && e.target.closest && e.target.closest('.protected-media')) e.preventDefault();
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
