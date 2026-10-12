import type { AppProps } from "next/app";
import "../styles/globals.css";
import { ToastProvider } from "../web/components/ui/ToastProvider";
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}