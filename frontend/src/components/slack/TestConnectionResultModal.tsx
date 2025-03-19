import React from 'react'
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from '@heroui/react'
import { Icon } from '@iconify/react'
import { SlackAgent } from '@/utils/api'

interface TestConnectionResultModalProps {
    isOpen: boolean
    onClose: () => void
    agent: SlackAgent | null
    channel: string
    isSuccess: boolean
    message?: string
}

const TestConnectionResultModal: React.FC<TestConnectionResultModalProps> = ({
    isOpen,
    onClose,
    agent,
    channel,
    isSuccess,
    message = "Message was sent successfully to Slack!",
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader className="flex gap-1">
                    <div className="flex items-center gap-2">
                        <Icon icon={isSuccess ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                              className={isSuccess ? "text-success" : "text-danger"}
                              width={24} />
                        {isSuccess ? "Test Connection Successful" : "Test Connection Failed"}
                    </div>
                </ModalHeader>
                <ModalBody>
                    {isSuccess ? (
                        <div className="space-y-4">
                            <p>{message}</p>
                            <div className="bg-success-50 dark:bg-success-900/20 p-4 rounded-lg border border-success-200 dark:border-success-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon icon="logos:slack-icon" width={20} />
                                    <span className="font-medium">Connection Details</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex gap-2">
                                        <span className="font-medium">Agent:</span>
                                        <span>{agent?.name || "Unknown"}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-medium">Channel:</span>
                                        <span>#{channel}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-medium">Workspace:</span>
                                        <span>{agent?.slack_team_name || "Unknown"}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-default-500">
                                Check your Slack channel to see the test message.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-danger">{message || "We couldn't send a message to Slack. Please check your configuration."}</p>
                            <div className="bg-danger-50 dark:bg-danger-900/20 p-4 rounded-lg border border-danger-200 dark:border-danger-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon icon="solar:danger-triangle-bold" width={20} className="text-danger" />
                                    <span className="font-medium">Troubleshooting Tips</span>
                                </div>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>Verify that your bot token is correctly configured</li>
                                    <li>Make sure your app is invited to the #{channel} channel</li>
                                    <li>Check that your app has the necessary permissions</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onPress={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

export default TestConnectionResultModal