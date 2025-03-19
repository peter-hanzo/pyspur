import React, { useState } from 'react'
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Card,
    CardBody,
    CardHeader,
    Tabs,
    Tab,
    Switch,
    Input,
    Chip,
} from '@heroui/react'
import { Icon } from '@iconify/react'
import { SlackAgent, toggleSlackTrigger, testSlackConnection, deleteSlackAgent } from '@/utils/api'
import AgentTokenManager from './AgentTokenManager'

interface SlackAgentDetailProps {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    agent: SlackAgent | null
    updateAgentsCallback: (updater: (agents: SlackAgent[]) => SlackAgent[]) => void
    onAlert?: (message: string, color: 'success' | 'danger' | 'warning' | 'default') => void
    onTokenUpdated?: () => void
}

const SlackAgentDetail: React.FC<SlackAgentDetailProps> = ({
    isOpen,
    onOpenChange,
    agent,
    updateAgentsCallback,
    onAlert,
    onTokenUpdated,
}) => {
    const [selectedTab, setSelectedTab] = useState('tokens')
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [keywords, setKeywords] = useState<string>(agent?.trigger_keywords?.join(', ') || '')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleTokenUpdated = () => {
        // Refresh the agents list after token update
        // This would typically be implemented via the parent component's callback
        onTokenUpdated?.()

        // Also update the UI with a success message if onTokenUpdated doesn't handle it
        if (!onTokenUpdated && onAlert) {
            onAlert('Token configuration updated', 'success')
        }
    }

    const handleSwitchChange = async (field: string, value: boolean) => {
        if (!agent) return

        try {
            await toggleSlackTrigger(agent.id, field, value, [agent], updateAgentsCallback, onAlert)
        } catch (error) {
            console.error('Error toggling trigger:', error)
            onAlert?.('Failed to update trigger settings', 'danger')
        }
    }

    const handleTestConnection = async () => {
        if (!agent) return
        setIsLoading(true)
        try {
            await testSlackConnection(agent, onAlert)
        } catch (error) {
            console.error('Error testing connection:', error)
            onAlert?.('Failed to test connection', 'danger')
        } finally {
            setIsLoading(false)
        }
    }

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
                updateAgentsCallback((agents) =>
                    agents.map((a) => (a.id === agent.id ? updatedAgent : a))
                )
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

    const handleDeleteAgent = async () => {
        if (!agent) return
        setIsDeleting(true)
        try {
            const success = await deleteSlackAgent(agent.id, onAlert)
            if (success) {
                // Close the modal
                onOpenChange(false)
                // Update the agents list by removing this agent
                updateAgentsCallback((agents) => agents.filter((a) => a.id !== agent.id))
            }
        } catch (error) {
            console.error('Error deleting agent:', error)
            onAlert?.('Failed to delete agent', 'danger')
        } finally {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    if (!agent) {
        return null
    }

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex items-center gap-2">
                            <Icon icon="logos:slack-icon" width={24} />
                            <div>
                                <h2>{agent.name}</h2>
                                <p className="text-small text-default-500">{agent.slack_team_name}</p>
                            </div>
                        </ModalHeader>
                        <ModalBody>
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
                                    <div className="py-4">
                                        <AgentTokenManager
                                            agent={agent}
                                            onTokenUpdated={handleTokenUpdated}
                                            onAlert={onAlert}
                                        />
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
                                        <Card className="border border-default-200">
                                            <CardHeader>
                                                <h3 className="text-medium font-medium">Trigger Settings</h3>
                                            </CardHeader>
                                            <CardBody className="flex flex-col gap-4">
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
                                            </CardBody>
                                        </Card>
                                    </div>
                                </Tab>
                            </Tabs>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                color="primary"
                                variant="light"
                                startContent={<Icon icon="solar:test-tube-bold" width={20} />}
                                onPress={handleTestConnection}
                                isLoading={isLoading}
                            >
                                Test Connection
                            </Button>
                            <Button
                                color="danger"
                                variant="light"
                                onPress={() => setShowDeleteConfirm(true)}
                                endContent={<Icon icon="solar:trash-bin-trash-bold" />}
                            >
                                Delete Agent
                            </Button>
                            <Button color="primary" onPress={() => onOpenChange(false)}>
                                Close
                            </Button>
                        </ModalFooter>

                        {/* Delete confirmation modal */}
                        <Modal isOpen={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} size="sm">
                            <ModalContent>
                                {() => (
                                    <>
                                        <ModalHeader>Confirm Delete</ModalHeader>
                                        <ModalBody>
                                            <p>Are you sure you want to delete the agent <strong>{agent.name}</strong>?</p>
                                            <p className="text-small text-default-500 mt-2">
                                                This action cannot be undone. The agent and its token configuration will be permanently deleted.
                                            </p>
                                        </ModalBody>
                                        <ModalFooter>
                                            <Button
                                                color="default"
                                                variant="light"
                                                onPress={() => setShowDeleteConfirm(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                color="danger"
                                                onPress={handleDeleteAgent}
                                                isLoading={isDeleting}
                                            >
                                                Delete Agent
                                            </Button>
                                        </ModalFooter>
                                    </>
                                )}
                            </ModalContent>
                        </Modal>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}

export default SlackAgentDetail