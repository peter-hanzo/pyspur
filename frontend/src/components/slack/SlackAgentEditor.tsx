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
    Tabs,
    Tab,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Switch,
    Spinner,
} from '@heroui/react'
import { Icon } from '@iconify/react'
import {
    SlackAgent,
    fetchMaskedToken,
    saveSlackTokens,
    deleteSlackToken,
    toggleSlackTrigger,
    testSlackConnection,
    getSocketModeStatus,
    startSocketMode,
    stopSocketMode,
    SlackSocketModeResponse
} from '@/utils/api'
import SlackTestConnection from './SlackTestConnection'

interface AgentTokenManagerProps {
    agent: SlackAgent
    isOpen?: boolean
    onOpenChange?: (isOpen: boolean) => void
    onTokenUpdated?: () => void
    onAlert?: (message: string, color: 'success' | 'danger' | 'warning' | 'default') => void
    updateAgentsCallback?: (updater: (agents: SlackAgent[]) => SlackAgent[]) => void
    standalone?: boolean
}

interface TokenStatus {
    type: string
    label: string
    masked: string
    lastUpdated: string | null
    exists: boolean
}

// Add a type for the socketModeStatus state to include error responses
type SocketModeResponse = SlackSocketModeResponse | {
    error: true;
    errorType: string;
    message: string;
    originalError?: any
};

// Add a type guard to check if a response is an error response
const isErrorResponse = (response: SocketModeResponse): response is {
    error: true;
    errorType: string;
    message: string;
    originalError?: any
} => {
    return 'error' in response && response.error === true;
};

const AgentTokenManager: React.FC<AgentTokenManagerProps> = ({
    agent,
    isOpen,
    onOpenChange,
    onTokenUpdated,
    onAlert,
    updateAgentsCallback,
    standalone = false
}) => {
    const [selectedTab, setSelectedTab] = useState('tokens')
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
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Socket Mode state
    const [socketModeStatus, setSocketModeStatus] = useState<SocketModeResponse | null>(null)
    const [isSocketModeActive, setIsSocketModeActive] = useState(false)
    const [isSocketModeLoading, setIsSocketModeLoading] = useState(false)

    // Trigger settings state
    const [keywords, setKeywords] = useState<string>(agent?.trigger_keywords?.join(', ') || '')
    const [showTestConnectionModal, setShowTestConnectionModal] = useState(false)

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

            // Update keywords
            setKeywords(agent?.trigger_keywords?.join(', ') || '')

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
    }, [agent.id, agent.has_bot_token, agent.has_user_token, agent.has_app_token, agent.last_token_update, agent.trigger_keywords])

    // Fetch socket mode status when the socket-mode tab is selected
    useEffect(() => {
        if (agent && selectedTab === 'socket-mode') {
            checkSocketModeStatus();
        }
    }, [agent, selectedTab]);

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

    // Handle switch changes for trigger settings
    const handleSwitchChange = async (field: string, value: boolean) => {
        if (!agent) return

        try {
            await toggleSlackTrigger(
                agent.id,
                field,
                value,
                updateAgentsCallback ? [agent] : [],
                updateAgentsCallback,
                onAlert
            )
        } catch (error) {
            console.error('Error toggling trigger:', error)
            onAlert?.('Failed to update trigger settings', 'danger')
        }
    }

    // Update keywords
    const updateKeywords = async () => {
        if (!agent) return
        setIsLoading(true)
        try {
            // Split, trim, and filter out empty strings
            const keywordArray = keywords
                .split(',')
                .map((k) => k.trim())
                .filter((k) => k)

            const response = await fetch(`/api/slack/agents/${agent.id}/trigger-config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    trigger_on_mention: agent.trigger_on_mention,
                    trigger_on_direct_message: agent.trigger_on_direct_message,
                    trigger_on_channel_message: agent.trigger_on_channel_message,
                    trigger_keywords: keywordArray,
                    trigger_enabled: agent.trigger_enabled,
                }),
            })

            if (response.ok) {
                const updatedAgent = await response.json()
                if (updateAgentsCallback) {
                    updateAgentsCallback((agents) =>
                        agents.map((a) => (a.id === agent.id ? updatedAgent : a))
                    )
                }
                onAlert?.('Keywords updated successfully', 'success')
            } else {
                onAlert?.('Failed to update keywords', 'danger')
            }
        } catch (error) {
            console.error('Error updating keywords:', error)
            onAlert?.('Failed to update keywords', 'danger')
        } finally {
            setIsLoading(false)
        }
    }

    // Function to check the current socket mode status
    const checkSocketModeStatus = async () => {
        if (!agent) return;

        setIsSocketModeLoading(true);
        try {
            const status = await getSocketModeStatus(agent.id);

            // Check if response is an error object
            if (isErrorResponse(status)) {
                // Handle error silently (just log it) - we don't want to show errors for status checks
                console.error('Error checking socket mode status:', status);
                // Set to inactive if we can't determine status
                setIsSocketModeActive(false);
            } else {
                // Success response
                setSocketModeStatus(status);
                setIsSocketModeActive(status.socket_mode_active);
            }
        } catch (error) {
            // This should never happen with our new error handling, but just in case
            console.error('Unexpected error checking socket mode status:', error);
            setIsSocketModeActive(false);
        } finally {
            setIsSocketModeLoading(false);
        }
    };

    // Function to start socket mode
    const handleStartSocketMode = async () => {
        if (!agent) return;

        if (!agent.has_bot_token) {
            onAlert?.('Bot token required for Socket Mode. Configure it first.', 'warning');
            return;
        }

        setIsSocketModeLoading(true);
        try {
            const response = await startSocketMode(agent.id);

            // Check if response is an error object
            if (isErrorResponse(response)) {
                // Handle error response
                console.error('Socket Mode error:', response);

                let errorTitle = 'Socket Mode Error';
                const errorMessage = response.message;

                if (response.errorType === 'SocketModeTokenError') {
                    errorTitle = 'Socket Mode Token Required';
                } else if (response.errorType === 'SocketModeServerError') {
                    errorTitle = 'Server Error';
                }

                // Show a toast message
                onAlert?.(
                    errorTitle === 'Socket Mode Token Required'
                        ? 'Socket Mode requires an app-level token. See details for more information.'
                        : errorMessage,
                    errorTitle.includes('Token') ? 'warning' : 'danger'
                );
            } else {
                // Success response - it's a SlackSocketModeResponse
                setSocketModeStatus(response);
                setIsSocketModeActive(response.socket_mode_active);
                onAlert?.('Socket Mode started successfully', 'success');
            }
        } catch (error: any) {
            // This should never happen with our new error handling, but just in case
            console.error('Unexpected error starting socket mode:', error);
            onAlert?.('An unexpected error occurred', 'danger');
        } finally {
            setIsSocketModeLoading(false);
        }
    };

    // Function to stop socket mode
    const handleStopSocketMode = async () => {
        if (!agent) return;

        setIsSocketModeLoading(true);
        try {
            const response = await stopSocketMode(agent.id);

            // Check if response is an error object
            if (isErrorResponse(response)) {
                // Handle error response
                console.error('Socket Mode stop error:', response);
                onAlert?.(response.message, 'danger');
            } else {
                // Success response
                setSocketModeStatus(response);
                setIsSocketModeActive(response.socket_mode_active);
                onAlert?.('Socket Mode stopped successfully', 'success');
            }
        } catch (error: any) {
            // This should never happen with our new error handling, but just in case
            console.error('Unexpected error stopping socket mode:', error);
            onAlert?.('An unexpected error occurred while stopping Socket Mode', 'danger');
        } finally {
            setIsSocketModeLoading(false);
        }
    };

    // Function to test connection
    const handleTestConnection = () => {
        if (!agent) return
        if (!agent.has_bot_token) {
            onAlert?.('Bot token required. Configure it first.', 'warning')
            return
        }

        // Show the test connection modal
        setShowTestConnectionModal(true)
    }

    const renderContent = () => (
        <div className="space-y-4">
            <Tabs
                selectedKey={selectedTab}
                onSelectionChange={(key) => setSelectedTab(key.toString())}
                variant="underlined"
                classNames={{
                    base: "w-full",
                    tabList: "gap-6 w-full relative",
                }}
            >
                <Tab
                    key="tokens"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:key-minimalistic-bold" className="text-xl" />
                            <span>Authentication</span>
                        </div>
                    }
                >
                    <div className="py-4 space-y-6">
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
                    </div>
                </Tab>
                <Tab
                    key="triggers"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:bolt-bold" className="text-xl" />
                            <span>Triggers</span>
                        </div>
                    }
                >
                    <div className="py-4 space-y-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-medium">Enable Triggers</h4>
                                    <p className="text-small text-default-500">
                                        Master switch for all triggers
                                    </p>
                                </div>
                                <Switch
                                    isSelected={agent.trigger_enabled}
                                    onValueChange={(value) =>
                                        handleSwitchChange('trigger_enabled', value)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-medium">Respond to Mentions</h4>
                                    <p className="text-small text-default-500">
                                        Trigger when agent is @mentioned
                                    </p>
                                </div>
                                <Switch
                                    isDisabled={!agent.trigger_enabled}
                                    isSelected={agent.trigger_on_mention}
                                    onValueChange={(value) =>
                                        handleSwitchChange('trigger_on_mention', value)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-medium">Respond to Direct Messages</h4>
                                    <p className="text-small text-default-500">
                                        Trigger on any direct message to the bot
                                    </p>
                                </div>
                                <Switch
                                    isDisabled={!agent.trigger_enabled}
                                    isSelected={agent.trigger_on_direct_message}
                                    onValueChange={(value) =>
                                        handleSwitchChange('trigger_on_direct_message', value)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-medium">Respond in Channels</h4>
                                    <p className="text-small text-default-500">
                                        Trigger on channel messages with keywords
                                    </p>
                                </div>
                                <Switch
                                    isDisabled={!agent.trigger_enabled}
                                    isSelected={agent.trigger_on_channel_message}
                                    onValueChange={(value) =>
                                        handleSwitchChange('trigger_on_channel_message', value)
                                    }
                                />
                            </div>

                            {agent.trigger_on_channel_message && (
                                <div className="flex flex-col gap-2">
                                    <h4 className="text-medium">Trigger Keywords</h4>
                                    <p className="text-small text-default-500">
                                        Comma-separated list of keywords to trigger the agent
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="help, question, info"
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                            variant="bordered"
                                        />
                                        <Button
                                            color="primary"
                                            isLoading={isLoading}
                                            onPress={updateKeywords}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {agent.trigger_keywords?.map((keyword, index) => (
                                            <Chip key={index} size="sm">
                                                {keyword}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Tab>
                <Tab
                    key="socket-mode"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:socket-outline" className="text-xl" />
                            <span>Socket Mode</span>
                        </div>
                    }
                >
                    <div className="py-4 space-y-4">
                        <div className="flex flex-col gap-4">
                            <p className="text-small">
                                Socket Mode establishes a WebSocket connection with Slack, enabling real-time
                                event processing without requiring a public URL for events. This is ideal for
                                local development and environments without public endpoints.
                            </p>

                            <div className="flex items-center gap-3 my-2">
                                <div className="flex-1">
                                    <h4 className="font-medium">Status:</h4>
                                    {isSocketModeLoading ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Spinner size="sm" />
                                            <span className="text-small">Checking status...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${isSocketModeActive ? 'bg-success' : 'bg-danger'}`}></span>
                                            <span className="text-small">{isSocketModeActive ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        color="primary"
                                        isDisabled={isSocketModeActive || isSocketModeLoading || !agent.has_bot_token}
                                        isLoading={isSocketModeLoading && !isSocketModeActive}
                                        onPress={handleStartSocketMode}
                                        startContent={<Icon icon="solar:play-bold" />}
                                    >
                                        Start
                                    </Button>
                                    <Button
                                        color="danger"
                                        isDisabled={!isSocketModeActive || isSocketModeLoading}
                                        isLoading={isSocketModeLoading && isSocketModeActive}
                                        onPress={handleStopSocketMode}
                                        startContent={<Icon icon="solar:stop-bold" />}
                                    >
                                        Stop
                                    </Button>
                                </div>
                            </div>

                            {!agent.has_bot_token && (
                                <div className="p-3 bg-warning-50 text-warning-800 rounded-md mt-2">
                                    <div className="flex items-start gap-2">
                                        <Icon icon="solar:danger-triangle-bold" className="text-lg mt-0.5" />
                                        <div>
                                            <p className="font-medium">Bot Token Required</p>
                                            <p className="text-small">
                                                You need to configure a bot token in the Authentication tab before using Socket Mode.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Requirements for Socket Mode:</h4>
                                <ul className="list-disc list-inside text-small space-y-1 pl-2">
                                    <li>A bot token with the required scopes (connections:write)</li>
                                    <li>SLACK_SIGNING_SECRET environment variable configured</li>
                                    <li>Socket Mode enabled in your Slack app settings</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </Tab>
            </Tabs>

            {message && (
                <div className="text-tiny mt-2">
                    <div className="flex items-center gap-2">
                        <Icon
                            icon={message.includes('success') ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                            className={message.includes('success') ? "text-success" : "text-danger"}
                            width={16}
                        />
                        <p>{message}</p>
                    </div>
                </div>
            )}

            {!standalone && (
                <div className="flex justify-end mt-4 pt-4 border-t border-default-200">
                    <Button
                        color="primary"
                        variant="light"
                        startContent={<Icon icon="solar:test-tube-bold" width={20} />}
                        onPress={handleTestConnection}
                    >
                        Test Connection
                    </Button>
                </div>
            )}
        </div>
    )

    // If not a standalone component, return modal version
    if (!standalone && isOpen !== undefined && onOpenChange !== undefined) {
        return (
            <>
                <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside">
                    <ModalContent>
                        {() => (
                            <>
                                <ModalHeader className="flex items-center gap-2">
                                    <Icon icon="logos:slack-icon" width={24} />
                                    <div>
                                        <h2>Edit {agent.name}</h2>
                                        <p className="text-small text-default-500">{agent.slack_team_name}</p>
                                    </div>
                                </ModalHeader>
                                <ModalBody>
                                    {renderContent()}
                                </ModalBody>
                                <ModalFooter>
                                    <Button color="primary" onPress={() => onOpenChange(false)}>
                                        Close
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>

                {/* Test Connection Modal */}
                <SlackTestConnection
                    isOpen={showTestConnectionModal}
                    onClose={() => setShowTestConnectionModal(false)}
                    agent={agent}
                    onAlert={onAlert}
                />
            </>
        )
    }

    // Original card version
    return (
        <>
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
                    {renderContent()}
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

            {/* Test Connection Modal */}
            <SlackTestConnection
                isOpen={showTestConnectionModal}
                onClose={() => setShowTestConnectionModal(false)}
                agent={agent}
                onAlert={onAlert}
            />
        </>
    )
}

export default AgentTokenManager