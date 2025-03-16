import {
    Accordion,
    AccordionItem,
    Badge,
    Button,
    Icon,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader
} from '@heroui/react'
import { Icon as IconifyIcon } from '@iconify/react'
import { useRouter } from 'next/router'
import React from 'react'

interface SlackSetupGuideProps {
    onClose: () => void;
    onConnectClick: () => void;
    setupInfo?: any;
    onGoToSettings?: () => void;
}

const SlackSetupGuide: React.FC<SlackSetupGuideProps> = ({
    onClose,
    onConnectClick,
    setupInfo,
    onGoToSettings
}) => {
    const router = useRouter()

    return (
        <Modal isOpen={true} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex items-center gap-2">
                    <IconifyIcon icon="logos:slack-icon" width={24} />
                    <span>Slack Integration Setup</span>
                </ModalHeader>
                <ModalBody>
                    <p className="mb-4">
                        Set up Slack integration by following these steps:
                    </p>

                    <Accordion>
                        <AccordionItem
                            key="create-app"
                            subtitle="Creating a Slack app"
                            title={
                                <div className="flex items-center">
                                    <div className="bg-primary-50 dark:bg-primary-900 rounded-full h-6 w-6 flex items-center justify-center mr-2">
                                        <span className="text-primary font-semibold text-sm">1</span>
                                    </div>
                                    <span className="font-medium">Create a Slack App</span>
                                </div>
                            }
                        >
                            <div className="pl-8 text-sm space-y-2">
                                <p>To create a new Slack app:</p>
                                <ol className="list-decimal list-inside space-y-1 pl-2">
                                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">Slack API Apps page</a></li>
                                    <li>Click <strong>Create New App</strong> → <strong>From scratch</strong></li>
                                    <li>Name your app (e.g., &quot;PySpur Bot&quot;)</li>
                                    <li>Select the workspace where you want to install the app</li>
                                </ol>
                            </div>
                        </AccordionItem>

                        <AccordionItem
                            key="oauth-setup"
                            subtitle="Setting up OAuth and permissions"
                            title={
                                <div className="flex items-center">
                                    <div className="bg-primary-50 dark:bg-primary-900 rounded-full h-6 w-6 flex items-center justify-center mr-2">
                                        <span className="text-primary font-semibold text-sm">2</span>
                                    </div>
                                    <span className="font-medium">Configure OAuth & Permissions</span>
                                </div>
                            }
                        >
                            <div className="pl-8 text-sm space-y-2">
                                <p>Configure the OAuth settings for your app:</p>
                                <ol className="list-decimal list-inside space-y-1 pl-2">
                                    <li>In your app settings, go to <strong>OAuth & Permissions</strong></li>
                                    <li>Under <strong>Redirect URLs</strong>, add:
                                        <div className="bg-default-100 p-2 rounded mt-1 font-mono text-xs break-all">
                                            {setupInfo?.redirect_uri || `${window.location.origin}/api/slack/oauth/callback`}
                                        </div>
                                    </li>
                                    <li>Under <strong>Bot Token Scopes</strong>, add the following scopes:
                                        <div className="bg-default-100 p-2 rounded mt-1 font-mono text-xs">
                                            {setupInfo?.scopes_needed || "channels:read, chat:write, team:read, app_mentions:read, im:read, im:history"}
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        </AccordionItem>

                        <AccordionItem
                            key="configure-keys"
                            subtitle="Add your Client ID and Secret"
                            title={
                                <div className="flex items-center">
                                    <div className="bg-primary-50 dark:bg-primary-900 rounded-full h-6 w-6 flex items-center justify-center mr-2">
                                        <span className="text-primary font-semibold text-sm">3</span>
                                    </div>
                                    <span className="font-medium">Configure API Keys in PySpur</span>
                                </div>
                            }
                        >
                            <div className="pl-8 text-sm space-y-2">
                                <p>Add your Slack credentials to PySpur:</p>
                                <ol className="list-decimal list-inside space-y-1 pl-2">
                                    <li>In your Slack app settings, go to <strong>Basic Information</strong></li>
                                    <li>Find the <strong>App Credentials</strong> section</li>
                                    <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                                    <li>Add these values in PySpur Settings</li>
                                </ol>

                                {setupInfo && (
                                    <div className="mt-3 space-y-2">
                                        <p className="font-medium">Current API Key Status:</p>
                                        <div className="space-y-2">
                                            {setupInfo.keys.map((key: any) => (
                                                <div
                                                    key={key.name}
                                                    className={`p-2 rounded flex items-start ${
                                                        key.configured ? 'bg-success-50 dark:bg-success-900/20' : 'bg-danger-50 dark:bg-danger-900/20'
                                                    }`}
                                                >
                                                    <IconifyIcon
                                                        icon={key.configured ? 'lucide:check-circle' : 'lucide:alert-circle'}
                                                        className={key.configured ? 'text-success' : 'text-danger'}
                                                        width={18}
                                                    />
                                                    <div className="ml-2">
                                                        <p className="font-medium">{key.name}</p>
                                                        <p className="text-xs text-default-500">{key.description}</p>
                                                        {key.configured && <p className="text-xs mt-1">Value: {key.masked_value}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    color="primary"
                                    size="sm"
                                    className="mt-2"
                                    onPress={() => {
                                        onClose();
                                        if (typeof onGoToSettings === 'function') {
                                            onGoToSettings();
                                        }
                                    }}
                                    startContent={<IconifyIcon icon="lucide:settings" width={16} />}
                                >
                                    Go to Settings
                                </Button>
                            </div>
                        </AccordionItem>

                        <AccordionItem
                            key="connect"
                            subtitle="Connect and authorize"
                            title={
                                <div className="flex items-center">
                                    <div className="bg-primary-50 dark:bg-primary-900 rounded-full h-6 w-6 flex items-center justify-center mr-2">
                                        <span className="text-primary font-semibold text-sm">4</span>
                                    </div>
                                    <span className="font-medium">Connect to Slack</span>
                                </div>
                            }
                        >
                            <div className="pl-8 text-sm space-y-2">
                                <p>Once you&apos;ve completed all the steps above:</p>
                                <ol className="list-decimal list-inside space-y-1 pl-2">
                                    <li>Click the &quot;Connect to Slack&quot; button below</li>
                                    <li>A new window will open with Slack&apos;s authorization page</li>
                                    <li>Select the workspace where you want to install the app</li>
                                    <li>Review and approve the permissions</li>
                                </ol>

                                <Button
                                    color="primary"
                                    className="mt-2"
                                    onPress={onConnectClick}
                                    startContent={<IconifyIcon icon="logos:slack-icon" width={18} />}
                                    isDisabled={setupInfo && !setupInfo.configured}
                                >
                                    Connect to Slack
                                </Button>

                                {setupInfo && !setupInfo.configured && (
                                    <p className="text-danger text-xs mt-1">
                                        Please configure all required keys before connecting
                                    </p>
                                )}
                            </div>
                        </AccordionItem>
                    </Accordion>
                </ModalBody>
                <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        size="sm"
                        className="mt-2"
                        onPress={() => {
                            onClose();
                            if (typeof onGoToSettings === 'function') {
                                onGoToSettings();
                            }
                        }}
                        startContent={<IconifyIcon icon="lucide:settings" width={16} />}
                    >
                        Go to Settings
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

export default SlackSetupGuide