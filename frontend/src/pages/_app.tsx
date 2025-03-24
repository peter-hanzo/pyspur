import { HeroUIProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { Router } from 'next/router'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import React, { useEffect } from 'react'
import { Provider } from 'react-redux'

import store from '../store/store'
import '../styles/globals.css'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    useEffect(() => {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
            // Enable debug mode in development
            loaded: (posthog) => {
                if (process.env.NODE_ENV === 'development') posthog.debug()
            },
        })

        const handleRouteChange = () => posthog?.capture('$pageview')

        Router.events.on('routeChangeComplete', handleRouteChange)

        return () => {
            Router.events.off('routeChangeComplete', handleRouteChange)
        }
    }, [])
    return (
        <PostHogProvider client={posthog}>
            <Provider store={store}>
                <Head>
                    <link rel="icon" type="image/png" href="/pyspur-black.png" media="(prefers-color-scheme: light)" />
                    <link rel="icon" type="image/png" href="/pyspur-white.png" media="(prefers-color-scheme: dark)" />
                </Head>
                <HeroUIProvider>
                    <NextThemesProvider attribute="class" defaultTheme="system">
                        <Component {...pageProps} />
                    </NextThemesProvider>
                </HeroUIProvider>
            </Provider>
        </PostHogProvider>
    )
}

export default MyApp
