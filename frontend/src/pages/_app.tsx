import { HeroUIProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { Router } from 'next/router'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import React, { useEffect } from 'react'
import { Provider } from 'react-redux'

import { getAnonDataStatus } from '@/utils/api'

import store from '../store/store'
import '../styles/globals.css'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    let disableTracking = false
    let hasDataStatusBeenChecked = false
    useEffect(() => {
        const initializePostHog = async () => {
            disableTracking = await getAnonDataStatus()
            hasDataStatusBeenChecked = true
            if (disableTracking) {
                console.log('Anon data tracking is disabled')
                return
            }

            posthog.init('phc_4pzMZbAOQXaTwYMdZm7x5P9GW4eEqsxgRcFQDWGOepP' as string, {
                api_host: 'https://us.i.posthog.com' as string,
                autocapture: true,
                person_profiles: 'always',
                loaded: (posthog) => {
                    if (process.env.NODE_ENV === 'development') posthog.debug()
                },
            })

            const handleRouteChange = () => posthog?.capture('$pageview')

            Router.events.on('routeChangeComplete', handleRouteChange)

            return () => {
                Router.events.off('routeChangeComplete', handleRouteChange)
            }
        }

        initializePostHog()
    }, [])

    return (
        ((!hasDataStatusBeenChecked || disableTracking) && (
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
        )) || (
            <PostHogProvider client={posthog}>
                <Provider store={store}>
                    <Head>
                        <link
                            rel="icon"
                            type="image/png"
                            href="/pyspur-black.png"
                            media="(prefers-color-scheme: light)"
                        />
                        <link
                            rel="icon"
                            type="image/png"
                            href="/pyspur-white.png"
                            media="(prefers-color-scheme: dark)"
                        />
                    </Head>
                    <HeroUIProvider>
                        <NextThemesProvider attribute="class" defaultTheme="system">
                            <Component {...pageProps} />
                        </NextThemesProvider>
                    </HeroUIProvider>
                </Provider>
            </PostHogProvider>
        )
    )
}

export default MyApp
