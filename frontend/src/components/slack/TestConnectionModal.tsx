import React, { useState, useEffect } from 'react'
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Spinner
} from '@heroui/react'
import { Icon } from '@iconify/react'
import { AlertFunction, SlackAgent, sendTestMessage } from '@/utils/api'

interface TestConnectionModalProps {
    isOpen: boolean
    onClose: () => void
    agent: SlackAgent | null
    onTestComplete: (success: boolean, message: string, channel: string) => void
    onAlert?: AlertFunction
}

const TestConnectionModal: React.FC<TestConnectionModalProps> = ({
    isOpen,
    onClose,
    agent,
    onTestComplete,
    onAlert
}) => {
    const [channel, setChannel] = useState('general')
    const [message, setMessage] = useState('')
    const [isTesting, setIsTesting] = useState(false)

    // Update message whenever agent changes or modal opens
    useEffect(() => {
        if (agent && isOpen) {
            setMessage(`Test message from PySpur agent "${agent.name}"`)

            // Reset channel to general when opening with a new agent
            setChannel('general')
        }
    }, [agent, isOpen])

    const handleTest = async () => {
        if (!agent) return

        if (!agent.workflow_id) {
            onAlert?.('Please associate a workflow with this agent first', 'warning')
            onTestComplete(false, 'Please associate a workflow with this agent first', channel)
            return
        }

        if (!agent.has_bot_token) {
            onAlert?.('A bot token is required for sending messages. Please configure one first.', 'warning')
            onTestComplete(false, 'A bot token is required for sending messages. Please configure one first.', channel)
            return
        }

        setIsTesting(true)
        try {
            await sendTestMessage(channel, message, agent.id)

            const successMsg = 'Test message sent successfully!'
            onAlert?.(successMsg, 'success')
            onTestComplete(true, successMsg, channel)
        } catch (error: any) {
            console.error('Error sending test message:', error)

            // Extract the server error message if available
            let errorMessage = 'Failed to send test message'
            if (error.response?.data?.detail) {
                if (error.response.data.detail === "No Slack bot token configured") {
                    errorMessage = 'No Slack bot token configured. Please add a bot token in the agent settings first.'
                } else {
                    errorMessage = `Failed to send test message: ${error.response.data.detail}`
                }
            }

            onAlert?.(errorMessage, 'danger')
            onTestComplete(false, errorMessage, channel)
        } finally {
            setIsTesting(false)
            onClose()
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader className="flex gap-1">
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:test-tube-bold" width={24} className="text-primary" />
                        Test Slack Connection
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <div className="bg-default-100 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon icon="logos:slack-icon" width={20} />
                                <span className="font-medium">Connection Details</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex gap-2">
                                    <span className="font-medium w-24">Agent:</span>
                                    <span>{agent?.name || "Unknown"}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-medium w-24">Workspace:</span>
                                    <span>{agent?.slack_team_name || "Unknown"}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-medium w-24">Bot Token:</span>
                                    <span>{agent?.has_bot_token ? "✓ Configured" : "⚠️ Not Configured"}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-medium w-24">Workflow:</span>
                                    <span>{agent?.workflow_id ? "✓ Associated" : "⚠️ Not Associated"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Channel Name"
                                placeholder="Enter channel name (without #)"
                                value={channel}
                                onChange={(e) => setChannel(e.target.value)}
                                startContent={<Icon icon="lucide:hash" width={16} />}
                                description="The Slack channel where the test message will be sent"
                            />

                            <Input
                                label="Test Message"
                                placeholder="Enter a test message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                startContent={<Icon icon="lucide:message-square" width={16} />}
                                description="The message that will be sent to the channel"
                            />
                        </div>

                        <div className="text-sm text-default-500">
                            <p>Make sure your Slack app has been invited to the channel and has the necessary permissions.</p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="danger" variant="light" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleTest}
                        isDisabled={!channel || !message || isTesting || !agent?.has_bot_token}
                        startContent={isTesting ? <Spinner size="sm" /> : null}
                    >
                        {isTesting ? "Sending..." : "Send Test Message"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

export default TestConnectionModal