import React, { useState, useEffect } from 'react'
import {
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Input,
    Button,
    Chip,
    Tooltip,
} from '@heroui/react'
import { Icon } from '@iconify/react'
import { SlackAgent, fetchMaskedToken, saveSlackTokens, deleteSlackToken } from '@/utils/api'

interface AgentTokenManagerProps {
    agent: SlackAgent
    onTokenUpdated?: () => void
    onAlert?: (message: string, color: 'success' | 'danger' | 'warning' | 'default') => void
}

interface TokenStatus {
    type: string
    label: string
    masked: string
    lastUpdated: string | null
    exists: boolean
}

const AgentTokenManager: React.FC<AgentTokenManagerProps> = ({ agent, onTokenUpdated, onAlert }) => {
    const [botToken, setBotToken] = useState('')
    const [userToken, setUserToken] = useState('')
    const [appToken, setAppToken] = useState('')
    const [botTokenStatus, setBotTokenStatus] = useState<TokenStatus>({
        type: 'bot_token',
        label: 'Bot Token',
        masked: '',
        lastUpdated: null,
        exists: agent.has_bot_token
    })
    const [userTokenStatus, setUserTokenStatus] = useState<TokenStatus>({
        type: 'user_token',
        label: 'User Token',
        masked: '',
        lastUpdated: null,
        exists: agent.has_user_token
    })
    const [appTokenStatus, setAppTokenStatus] = useState<TokenStatus>({
        type: 'app_token',
        label: 'App Token',
        masked: '',
        lastUpdated: null,
        exists: agent.has_app_token || false
    })
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        console.log('AgentTokenManager - Agent updated:', {
            id: agent.id,
            has_bot_token: agent.has_bot_token,
            has_user_token: agent.has_user_token,
            has_app_token: agent.has_app_token,
            token_flags_type: {
                bot: typeof agent.has_bot_token,
                user: typeof agent.has_user_token,
                app: typeof agent.has_app_token
            }
        })

        if (agent) {
            // Convert token flags to booleans to ensure consistent type
            const hasBotToken = Boolean(agent.has_bot_token)
            const hasUserToken = Boolean(agent.has_user_token)
            const hasAppToken = Boolean(agent.has_app_token)

            console.log('Token flags after boolean conversion:', {
                hasBotToken,
                hasUserToken,
                hasAppToken
            })

            // Update token statuses
            setBotTokenStatus(prev => ({
                ...prev,
                exists: hasBotToken,
                lastUpdated: agent.last_token_update
            }))
            setUserTokenStatus(prev => ({
                ...prev,
                exists: hasUserToken,
                lastUpdated: agent.last_token_update
            }))
            setAppTokenStatus(prev => ({
                ...prev,
                exists: hasAppToken,
                lastUpdated: agent.last_token_update
            }))

            // Always clear any input values when the agent changes
            setBotToken('')
            setUserToken('')
            setAppToken('')

            // Always fetch the masked tokens if they exist, even on agent change
            // This ensures we always have up-to-date tokens
            const fetchTokens = async () => {
                console.log('Fetching tokens for agent:', agent.id, {
                    hasBotToken,
                    hasUserToken,
                    hasAppToken
                })
                try {
                    const promises = []

                    if (hasBotToken) {
                        console.log('Fetching bot token...')
                        promises.push(fetchMaskedTokenAndUpdate('bot_token'))
                    }
                    if (hasUserToken) {
                        console.log('Fetching user token...')
                        promises.push(fetchMaskedTokenAndUpdate('user_token'))
                    }
                    if (hasAppToken) {
                        console.log('Fetching app token...')
                        promises.push(fetchMaskedTokenAndUpdate('app_token'))
                    }

                    if (promises.length > 0) {
                        const results = await Promise.all(promises)
                        console.log('Token fetch results:', results)
                    } else {
                        console.log('No tokens to fetch')
                    }
                    console.log('All token fetches completed')
                } catch (error) {
                    console.error('Error fetching masked tokens:', error)
                    onAlert?.('Failed to load token information', 'warning')
                }
            }

            fetchTokens()
        }
    }, [agent.id, agent.has_bot_token, agent.has_user_token, agent.has_app_token, agent.last_token_update])

    const fetchMaskedTokenAndUpdate = async (tokenType: string) => {
        try {
            const data = await fetchMaskedToken(agent.id, tokenType)

            if (tokenType === 'bot_token') {
                setBotTokenStatus(prev => ({
                    ...prev,
                    masked: data.masked_token,
                    lastUpdated: data.updated_at
                }))
            } else if (tokenType === 'app_token') {
                setAppTokenStatus(prev => ({
                    ...prev,
                    masked: data.masked_token,
                    lastUpdated: data.updated_at
                }))
            } else {
                setUserTokenStatus(prev => ({
                    ...prev,
                    masked: data.masked_token,
                    lastUpdated: data.updated_at
                }))
            }
        } catch (error) {
            console.error(`Error fetching ${tokenType}:`, error)
            onAlert?.(`Failed to fetch ${tokenType}`, 'danger')
        }
    }

    const saveTokens = async () => {
        try {
            await saveSlackTokens(agent.id, {
                bot_token: botToken,
                user_token: userToken,
                app_token: appToken
            });
            setMessage('Tokens saved successfully');
            onTokenUpdated?.();
        } catch (error) {
            console.error('Error saving tokens:', error);
            setMessage('Failed to save tokens');
        }
    }

    const handleDeleteToken = async (tokenType: string) => {
        setIsLoading(true)
        try {
            await deleteSlackToken(agent.id, tokenType)

            // Update token status
            if (tokenType === 'bot_token') {
                setBotTokenStatus(prev => ({
                    ...prev,
                    exists: false,
                    masked: '',
                    lastUpdated: null
                }))
            } else if (tokenType === 'app_token') {
                setAppTokenStatus(prev => ({
                    ...prev,
                    exists: false,
                    masked: '',
                    lastUpdated: null
                }))
            } else {
                setUserTokenStatus(prev => ({
                    ...prev,
                    exists: false,
                    masked: '',
                    lastUpdated: null
                }))
            }

            onAlert?.(`${tokenType === 'bot_token' ? 'Bot' : tokenType === 'app_token' ? 'App' : 'User'} token deleted successfully`, 'success')
            onTokenUpdated?.()
        } catch (error) {
            console.error(`Error deleting ${tokenType}:`, error)
            onAlert?.(`Failed to delete ${tokenType}`, 'danger')
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    const getTokenPrefix = (tokenType: string) => {
        if (tokenType === 'bot_token') return 'xoxb-'
        if (tokenType === 'user_token') return 'xoxp-'
        if (tokenType === 'app_token') return 'xapp-'
        return ''
    }

    const renderTokenSection = (
        tokenType: string,
        status: TokenStatus,
        tokenValue: string,
        setTokenValue: (value: string) => void
    ) => {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-medium font-medium">{status.label}</h3>
                    {status.exists ? (
                        <Chip color="success" size="sm">
                            Configured
                        </Chip>
                    ) : (
                        <Chip color="warning" size="sm">
                            Not Configured
                        </Chip>
                    )}
                </div>

                {status.exists ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 font-mono text-small bg-default-100 rounded-lg p-3 border border-default-200">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:key-minimalistic-bold" className="text-default-500" width={16} />
                                    <span className="text-default-500 truncate overflow-hidden max-w-[250px]">{status.masked}</span>
                                </div>
                                <div className="text-tiny text-default-400 mt-1">
                                    Last updated: {formatDate(status.lastUpdated)}
                                </div>
                            </div>
                            <Tooltip content="Delete token">
                                <Button
                                    isIconOnly
                                    color="danger"
                                    variant="light"
                                    size="sm"
                                    onPress={() => handleDeleteToken(tokenType)}
                                    isLoading={isLoading}
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" width={20} />
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Input
                                    type="password"
                                    label={`Enter ${status.label}`}
                                    placeholder={`Paste ${status.label.toLowerCase()} here`}
                                    value={tokenValue}
                                    onChange={(e) => setTokenValue(e.target.value)}
                                    variant="bordered"
                                    size="sm"
                                    startContent={
                                        <div className="pointer-events-none flex items-center">
                                            <Icon icon="solar:key-minimalistic-bold" className="text-default-400" width={16} />
                                        </div>
                                    }
                                    description={
                                        <div className="flex items-center gap-1 mt-1 text-tiny text-default-400">
                                            <Icon icon="solar:info-circle-bold" width={14} />
                                            {status.label} should start with <code className="mx-1">{getTokenPrefix(tokenType)}</code>
                                        </div>
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card className="border border-default-200">
            <CardHeader className="flex items-center justify-between gap-2 pb-0">
                <div>
                    <h3 className="text-medium font-medium">Slack Tokens</h3>
                    <p className="text-tiny text-default-500">
                        Configure authentication tokens for this Slack agent
                    </p>
                </div>
                <Icon icon="logos:slack-icon" width={24} />
            </CardHeader>
            <CardBody className="space-y-6">
                {renderTokenSection('bot_token', botTokenStatus, botToken, setBotToken)}
                {renderTokenSection('user_token', userTokenStatus, userToken, setUserToken)}
                {renderTokenSection('app_token', appTokenStatus, appToken, setAppToken)}

                {/* Save button - only show if there are tokens to save */}
                {(botToken || userToken || appToken) && (
                    <div className="flex justify-end pt-4 border-t border-default-200">
                        <Button
                            color="primary"
                            size="sm"
                            onPress={() => saveTokens()}
                            isLoading={isLoading}
                            startContent={<Icon icon="solar:disk-bold" width={18} />}
                        >
                            Save Tokens
                        </Button>
                    </div>
                )}
            </CardBody>
            {message && (
                <CardFooter className="text-tiny text-default-500">
                    <div className="flex items-center gap-2">
                        <Icon
                            icon={message.includes('success') ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                            className={message.includes('success') ? "text-success" : "text-danger"}
                            width={16}
                        />
                        <p>{message}</p>
                    </div>
                </CardFooter>
            )}
        </Card>
    )
}

export default AgentTokenManager