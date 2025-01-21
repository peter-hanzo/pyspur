import React from 'react'
import { Provider } from 'react-redux'
import { HeroUIProvider } from '@heroui/react'
import { AppProps } from 'next/app'
import store from '../store/store'
import '../styles/globals.css'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <Provider store={store}>
            <HeroUIProvider>
                <NextThemesProvider attribute="class" defaultTheme="light">
                    <Component {...pageProps} />
                </NextThemesProvider>
            </HeroUIProvider>
        </Provider>
    )
}

export default MyApp
