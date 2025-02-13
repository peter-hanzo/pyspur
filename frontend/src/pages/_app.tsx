import { HeroUIProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { AppProps } from 'next/app'
import Head from 'next/head'
import React from 'react'
import { Provider } from 'react-redux'
import store from '../store/store'
import '../styles/globals.css'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <Provider store={store}>
            <Head>
                <link rel="icon" type="image/svg+xml" href="/pyspur-logo.svg" />
            </Head>
            <HeroUIProvider>
                <NextThemesProvider attribute="class" defaultTheme="light">
                    <Component {...pageProps} />
                </NextThemesProvider>
            </HeroUIProvider>
        </Provider>
    )
}

export default MyApp
