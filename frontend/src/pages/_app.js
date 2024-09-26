import { NextUIProvider } from '@nextui-org/react';
import "../styles/globals.css"; // Add this line to import global styles

function MyApp({ Component, pageProps }) {
  return (
    <NextUIProvider>
      <Component {...pageProps} />
    </NextUIProvider>
  );
}

export default MyApp;