import React from 'react';
import { Provider } from 'react-redux';
import { NextUIProvider } from '@nextui-org/react';
import store from '../store/store';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <NextUIProvider>
        <Component {...pageProps} />
      </NextUIProvider>
    </Provider>
  );
}

export default MyApp;