import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
    Button,
    Card,
    CardBody,
    Input,
    Textarea,
    Select,
    SelectItem,
    Divider,
    Switch,
    Tooltip,
    Chip,
    Alert,
    Checkbox,
    RadioGroup,
    Radio,
    Accordion,
    AccordionItem,
} from '@heroui/react'
import { Info, CheckCircle, ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { createSlackAgent, SlackAgent } from '@/utils/api'
import { SpurType, WorkflowResponse } from '@/types/api_types/workflowSchemas'

interface SlackAgentWizardProps {
    workflows: WorkflowResponse[];
    onCreated?: (agent: SlackAgent, workflowId: string) => void;
    onCancel: () => void;
    isStandalone?: boolean;
}

const SlackAgentWizard: React.FC<SlackAgentWizardProps> = ({
    workflows,
    onCreated,
    onCancel,
    isStandalone = false
}) => {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null)

    // Agent configuration state
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('')
    const [spurType, setSpurType] = useState<SpurType | ''>('')
    const [triggerEnabled, setTriggerEnabled] = useState(true)
    const [triggerOnMention, setTriggerOnMention] = useState(true)
    const [triggerOnDM, setTriggerOnDM] = useState(true)
    const [triggerOnChannel, setTriggerOnChannel] = useState(false)
    const [keywords, setKeywords] = useState<string>('')

    // Added for Slack token and socket mode support
    const [botToken, setBotToken] = useState('')
    const [appToken, setAppToken] = useState('')
    const [enableSocketMode, setEnableSocketMode] = useState(false)

    const maskToken = (token: string) => token.length > 8 ? token.substring(0, 4) + "••••" + token.substring(token.length - 4) : token

    // Clear alert after 3 seconds
    useEffect(() => {
        if (alert) {
            const timer = setTimeout(() => {
                setAlert(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [alert])

    const handleSubmit = async () => {
        try {
            // Basic validation
            if (!name.trim()) {
                setAlert({ type: 'danger', message: 'Please enter a name for the agent' })
                return
            }

            // Validate token based on socket mode
            if (enableSocketMode && !appToken.trim()) {
                setAlert({ type: 'danger', message: 'App Token is required for Socket Mode' })
                return
            }

            if (!enableSocketMode && !botToken.trim()) {
                setAlert({ type: 'danger', message: 'Bot Token is required for Classic Mode' })
                return
            }

            // Ensure a workflow is selected
            if (!selectedWorkflowId) {
                setAlert({ type: 'danger', message: 'A workflow must be selected to create an agent' })
                return
            }

            setIsSubmitting(true)
            console.log('Creating Slack agent...')

            // Parse keywords into an array
            const keywordsArray = keywords
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0)

            // Create the agent with appropriate token based on socket mode
            const newAgent = await createSlackAgent(name, {
                workflow_id: selectedWorkflowId,
                trigger_enabled: triggerEnabled,
                trigger_on_mention: triggerOnMention,
                trigger_on_direct_message: triggerOnDM,
                trigger_on_channel_message: triggerOnChannel,
                trigger_keywords: keywordsArray,
                enable_socket_mode: enableSocketMode,
                ...(enableSocketMode ? { app_token: appToken } : { bot_token: botToken })
            } as any)

            if (newAgent) {
                setAlert({ type: 'success', message: 'Slack agent created successfully!' })

                // Notify parent component with the new agent and the selected workflow ID
                if (onCreated) {
                    onCreated(newAgent, selectedWorkflowId)
                }
            } else {
                setAlert({ type: 'danger', message: 'Failed to create agent. Please try again.' })
            }
        } catch (error) {
            console.error('Error creating agent:', error)
            const errorMessage = error.response?.data?.detail
                ? `Error: ${JSON.stringify(error.response.data.detail)}`
                : 'Error creating agent. Please check if Slack is properly configured.'
            setAlert({ type: 'danger', message: errorMessage })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSpurTypeChange = (value: string) => {
        setSpurType(value as SpurType | '')
        // Reset workflow selection when type changes
        setSelectedWorkflowId('')
    }

    const filteredWorkflows = spurType
        ? workflows.filter(w => w.definition.spur_type === spurType)
        : workflows

    // Use different container classes depending on whether this is a modal or standalone page
    const containerClass = isStandalone
        ? "w-full mx-auto" // For standalone page
        : "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"; // For modal

    return (
        <div className={containerClass}>
            <div className={`${isStandalone ? "max-w-[900px] w-full mx-auto" : "max-w-[900px] w-full mx-auto bg-background p-6 rounded-xl shadow-xl border border-default-200"}`}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-default-900">Create Slack Agent</h1>
                            <p className="text-sm text-default-500">Configure your agent to respond in Slack channels and DMs</p>
                        </div>
                    </div>

                    <AnimatePresence>
                        {alert && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Alert
                                    className="mb-4"
                                    color={alert.type}
                                    startContent={
                                        alert.type === 'success' ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Info className="h-4 w-4" />
                                        )
                                    }
                                >
                                    {alert.message}
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Card className="mb-6 border border-default-200">
                        <CardBody>
                            <Accordion>
                                {/* Agent Information Section */}
                                <AccordionItem
                                    key="1"
                                    aria-label="Agent Information"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">1</span>
                                            <span className="text-md font-semibold">Agent Information</span>
                                        </div>
                                    }
                                    subtitle="Set your agent's name and connection details"
                                    defaultOpen
                                >
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Agent Name"
                                                placeholder="e.g., Customer Support Bot"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                isRequired
                                                description="What users will see in Slack"
                                            />

                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    size="md"
                                                    isSelected={enableSocketMode}
                                                    onValueChange={setEnableSocketMode}
                                                />
                                                <div>
                                                    <span className="text-sm font-medium">Socket Mode</span>
                                                    <p className="text-xs text-default-500">
                                                        {enableSocketMode
                                                            ? "Uses App-Level Token (xapp-)"
                                                            : "Uses Bot User Token (xoxb-)"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                {enableSocketMode ? (
                                                    <Input
                                                        label="Slack App Token"
                                                        placeholder="xapp-..."
                                                        value={appToken}
                                                        onChange={(e) => setAppToken(e.target.value)}
                                                        description="Enter your Slack App Token (starts with 'xapp-')"
                                                        endContent={appToken && <span>{maskToken(appToken)}</span>}
                                                        isRequired
                                                    />
                                                ) : (
                                                    <Input
                                                        label="Slack Bot Token"
                                                        placeholder="xoxb-..."
                                                        value={botToken}
                                                        onChange={(e) => setBotToken(e.target.value)}
                                                        description="Enter your Slack Bot User OAuth Token (starts with 'xoxb-')"
                                                        endContent={botToken && <span>{maskToken(botToken)}</span>}
                                                        isRequired
                                                    />
                                                )}
                                            </div>

                                            <div className="md:col-span-2">
                                                <Textarea
                                                    label="Description (Optional)"
                                                    placeholder="Briefly describe what this agent will do"
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </AccordionItem>

                                {/* Workflow Selection Section */}
                                <AccordionItem
                                    key="2"
                                    aria-label="Workflow Selection"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">2</span>
                                            <span className="text-md font-semibold">Workflow Selection</span>
                                        </div>
                                    }
                                    subtitle="Choose a workflow for this agent to run"
                                    defaultOpen
                                >
                                    <div className="space-y-4 pt-2">
                                        <div className="bg-default-50 rounded-lg p-4">
                                            <RadioGroup
                                                value={spurType}
                                                onValueChange={(value) => handleSpurTypeChange(value)}
                                                label="Filter workflows by type"
                                                orientation="horizontal"
                                                classNames={{
                                                    wrapper: 'gap-4',
                                                }}
                                            >
                                                <Radio
                                                    value=""
                                                    description="Show all workflows"
                                                >
                                                    All Types
                                                </Radio>
                                                <Radio
                                                    value={SpurType.WORKFLOW}
                                                    description="Standard workflow spurs"
                                                >
                                                    Workflows
                                                </Radio>
                                                <Radio
                                                    value={SpurType.CHATBOT}
                                                    description="Conversational chatbot spurs"
                                                >
                                                    Chatbots
                                                </Radio>
                                            </RadioGroup>

                                            <div className="mt-4">
                                                {filteredWorkflows.length === 0 ? (
                                                    <div className="text-center p-4 bg-default-100 rounded-lg">
                                                        <p className="text-default-500">
                                                            {spurType
                                                                ? `No ${spurType.toLowerCase()} spurs available`
                                                                : 'No workflows available'}
                                                        </p>
                                                        <p className="text-xs text-default-400 mt-2">
                                                            Create a workflow first or change your filter selection
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto p-2">
                                                        {filteredWorkflows.map((workflow) => (
                                                            <div
                                                                key={workflow.id}
                                                                className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors
                                                                    ${selectedWorkflowId === workflow.id
                                                                        ? 'border-primary bg-primary/5'
                                                                        : 'border-default-200 hover:border-primary/50 hover:bg-default-100'
                                                                    }`}
                                                                onClick={() => setSelectedWorkflowId(workflow.id)}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="font-medium">{workflow.name}</div>
                                                                    <Chip size="sm" variant="flat" color="primary">
                                                                        {workflow.definition.spur_type}
                                                                    </Chip>
                                                                </div>
                                                                {workflow.description && (
                                                                    <p className="text-xs text-default-500">{workflow.description}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionItem>

                                {/* Trigger Settings Section */}
                                <AccordionItem
                                    key="3"
                                    aria-label="Trigger Settings"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">3</span>
                                            <span className="text-md font-semibold">Trigger Settings</span>
                                        </div>
                                    }
                                    subtitle="Configure when your agent should respond"
                                    defaultOpen
                                >
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-grow">
                                                <h4 className="text-sm font-medium">Enable Triggers</h4>
                                                <p className="text-xs text-default-500">Agent will respond when enabled</p>
                                            </div>
                                            <Switch
                                                size="lg"
                                                isSelected={triggerEnabled}
                                                onValueChange={setTriggerEnabled}
                                            />
                                        </div>

                                        <Divider className="my-3" />

                                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${!triggerEnabled ? 'opacity-50' : ''}`}>
                                            <div className="p-3 border rounded-lg">
                                                <Checkbox
                                                    isSelected={triggerOnMention}
                                                    onValueChange={setTriggerOnMention}
                                                    isDisabled={!triggerEnabled}
                                                >
                                                    <div>
                                                        <span className="font-medium">@mentions</span>
                                                        <p className="text-xs text-default-500">
                                                            Responds to @AgentName
                                                        </p>
                                                    </div>
                                                </Checkbox>
                                            </div>

                                            <div className="p-3 border rounded-lg">
                                                <Checkbox
                                                    isSelected={triggerOnDM}
                                                    onValueChange={setTriggerOnDM}
                                                    isDisabled={!triggerEnabled}
                                                >
                                                    <div>
                                                        <span className="font-medium">Direct Messages</span>
                                                        <p className="text-xs text-default-500">
                                                            Responds to all DMs
                                                        </p>
                                                    </div>
                                                </Checkbox>
                                            </div>

                                            <div className="p-3 border rounded-lg">
                                                <Checkbox
                                                    isSelected={triggerOnChannel}
                                                    onValueChange={setTriggerOnChannel}
                                                    isDisabled={!triggerEnabled}
                                                >
                                                    <div>
                                                        <span className="font-medium">Channel Messages</span>
                                                        <p className="text-xs text-default-500">
                                                            All messages in any channel
                                                        </p>
                                                    </div>
                                                </Checkbox>
                                            </div>
                                        </div>

                                        <div className={`${!triggerEnabled ? 'opacity-50' : ''}`}>
                                            <Input
                                                label="Keyword Triggers (Optional)"
                                                placeholder="help, support, question (comma-separated)"
                                                value={keywords}
                                                onChange={(e) => setKeywords(e.target.value)}
                                                isDisabled={!triggerEnabled}
                                                description="Agent will also respond when these keywords are mentioned"
                                            />
                                        </div>
                                    </div>
                                </AccordionItem>
                            </Accordion>
                        </CardBody>
                    </Card>

                    <div className="flex justify-between items-center">
                        <Button
                            color="danger"
                            variant="light"
                            onPress={onCancel}
                            className="font-medium hover:bg-danger/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleSubmit}
                            className="font-medium"
                            isLoading={isSubmitting}
                            isDisabled={isSubmitting}
                        >
                            Create Agent
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default SlackAgentWizard