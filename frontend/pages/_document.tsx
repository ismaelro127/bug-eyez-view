// pages/_document.tsx

import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* PWA: Manifest & Theme */}
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#000000" />

          {/* (Optional) Icons */}
          <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
          <link rel="icon" href="/icons/icon-192.png" />
        </Head>

        <body className="bg-black text-white">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
