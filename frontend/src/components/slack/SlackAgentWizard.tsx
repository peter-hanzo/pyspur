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
    Progress,
    Divider,
    Switch,
    Tooltip,
    Chip,
    Alert,
    Checkbox,
    RadioGroup,
    Radio,
} from '@heroui/react'
import { Info, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
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

const steps = ['Agent Information', 'Workflow Selection', 'Trigger Settings', 'Review & Create']

const SlackAgentWizard: React.FC<SlackAgentWizardProps> = ({
    workflows,
    onCreated,
    onCancel,
    isStandalone = false
}) => {
    const router = useRouter()
    const [activeStep, setActiveStep] = useState(0)
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
            setIsSubmitting(true)
            console.log('Creating Slack agent...')

            // Parse keywords into an array
            const keywordsArray = keywords
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0)

            // Create the agent
            const newAgent = await createSlackAgent(name, {
                workflow_id: selectedWorkflowId || undefined,
                trigger_enabled: triggerEnabled,
                trigger_on_mention: triggerOnMention,
                trigger_on_direct_message: triggerOnDM,
                trigger_on_channel_message: triggerOnChannel,
                trigger_keywords: keywordsArray
            })

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
            setAlert({ type: 'danger', message: 'Error creating agent. Please check if Slack is properly configured.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleNext = () => {
        if (activeStep === 0 && !name.trim()) {
            setAlert({ type: 'danger', message: 'Please enter a name for the agent' })
            return
        }

        if (activeStep < steps.length - 1) {
            setActiveStep((prevStep) => prevStep + 1)
        } else {
            handleSubmit()
        }
    }

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1)
    }

    const handleSpurTypeChange = (value: string) => {
        setSpurType(value as SpurType | '')
        // Reset workflow selection when type changes
        setSelectedWorkflowId('')
    }

    const filteredWorkflows = spurType
        ? workflows.filter(w => w.definition.spur_type === spurType)
        : workflows

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    label="Agent Name"
                                    placeholder="e.g., Customer Support Bot"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    isRequired
                                    description="Give your agent a descriptive name"
                                />
                            </div>
                            <div className="space-y-2">
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
                )

            case 1:
                return (
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">Workflow Selection</h3>
                                    <Tooltip content="Select a workflow that this agent will run when triggered">
                                        <Info className="w-4 h-4 text-default-400" />
                                    </Tooltip>
                                </div>
                                <div className="p-4 bg-default-50 rounded-lg">
                                    <div className="mb-4">
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
                                    </div>

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
                                            <div className="space-y-4">
                                                <p className="text-sm text-default-600 mb-2">
                                                    Select a workflow for this agent to run:
                                                </p>
                                                <div className="grid gap-3 max-h-[350px] overflow-y-auto p-2">
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
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">Trigger Settings</h3>
                                <Tooltip content="Configure what events will trigger this agent to respond">
                                    <Info className="w-4 h-4 text-default-400" />
                                </Tooltip>
                            </div>

                            <div className="p-6 border border-default-200 rounded-lg">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-md font-medium">Enable Triggers</h4>
                                        <p className="text-sm text-default-500">Agent will respond to messages when enabled</p>
                                    </div>
                                    <Switch
                                        size="lg"
                                        isSelected={triggerEnabled}
                                        onValueChange={setTriggerEnabled}
                                    />
                                </div>

                                <Divider className="my-4" />

                                <div className="space-y-4 mt-6">
                                    <h4 className="text-md font-medium">Response Conditions</h4>
                                    <p className="text-sm text-default-500 mb-2">
                                        Select when your agent should respond:
                                    </p>

                                    <div className="grid gap-4 mt-2">
                                        <div className={`p-4 border rounded-lg ${!triggerEnabled ? 'opacity-50' : ''}`}>
                                            <Checkbox
                                                isSelected={triggerOnMention}
                                                onValueChange={setTriggerOnMention}
                                                isDisabled={!triggerEnabled}
                                                size="lg"
                                            >
                                                <div className="ml-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">@mentions</span>
                                                        <Chip size="sm" color="primary" variant="flat">Recommended</Chip>
                                                    </div>
                                                    <p className="text-sm text-default-500">
                                                        Agent will respond when mentioned in channels with @AgentName
                                                    </p>
                                                </div>
                                            </Checkbox>
                                        </div>

                                        <div className={`p-4 border rounded-lg ${!triggerEnabled ? 'opacity-50' : ''}`}>
                                            <Checkbox
                                                isSelected={triggerOnDM}
                                                onValueChange={setTriggerOnDM}
                                                isDisabled={!triggerEnabled}
                                                size="lg"
                                            >
                                                <div className="ml-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Direct Messages</span>
                                                        <Chip size="sm" color="primary" variant="flat">Recommended</Chip>
                                                    </div>
                                                    <p className="text-sm text-default-500">
                                                        Agent will respond to all messages sent directly to it
                                                    </p>
                                                </div>
                                            </Checkbox>
                                        </div>

                                        <div className={`p-4 border rounded-lg ${!triggerEnabled ? 'opacity-50' : ''}`}>
                                            <Checkbox
                                                isSelected={triggerOnChannel}
                                                onValueChange={setTriggerOnChannel}
                                                isDisabled={!triggerEnabled}
                                                size="lg"
                                            >
                                                <div className="ml-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Channel Messages</span>
                                                        <Chip size="sm" color="danger" variant="flat">Use with caution</Chip>
                                                    </div>
                                                    <p className="text-sm text-default-500">
                                                        Agent will respond to all messages in channels it's added to
                                                    </p>
                                                </div>
                                            </Checkbox>
                                        </div>
                                    </div>

                                    <div className={`mt-6 ${!triggerEnabled ? 'opacity-50' : ''}`}>
                                        <Input
                                            label="Keyword Triggers (Optional)"
                                            placeholder="help, support, question (comma-separated)"
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                            isDisabled={!triggerEnabled}
                                            description="Agent will respond when these keywords are mentioned in messages"
                                            endContent={
                                                <Tooltip content="Leave empty to respond to all messages based on the conditions above">
                                                    <Info className="w-4 h-4 text-default-400" />
                                                </Tooltip>
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Review Configuration</h3>
                            <Tooltip content="Review your agent configuration before creating">
                                <Info className="w-4 h-4 text-default-400" />
                            </Tooltip>
                        </div>

                        <div className="grid gap-6">
                            <Card className="bg-default-50">
                                <CardBody>
                                    <h4 className="text-md font-medium mb-3">Basic Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-default-500">Name</p>
                                            <p className="font-medium">{name}</p>
                                        </div>
                                        {description && (
                                            <div className="col-span-2">
                                                <p className="text-sm text-default-500">Description</p>
                                                <p className="font-medium">{description}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>

                            <Card className="bg-default-50">
                                <CardBody>
                                    <h4 className="text-md font-medium mb-3">Workflow</h4>
                                    {selectedWorkflowId ? (
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">
                                                    {workflows.find(w => w.id === selectedWorkflowId)?.name}
                                                </p>
                                                <Chip size="sm" variant="flat" color="primary">
                                                    {workflows.find(w => w.id === selectedWorkflowId)?.definition.spur_type}
                                                </Chip>
                                            </div>
                                            <p className="text-sm text-default-500 mt-1">
                                                {workflows.find(w => w.id === selectedWorkflowId)?.description || 'No description'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-default-500">No workflow selected</p>
                                    )}
                                </CardBody>
                            </Card>

                            <Card className="bg-default-50">
                                <CardBody>
                                    <h4 className="text-md font-medium mb-3">Trigger Settings</h4>

                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-default-500">Triggers Enabled</p>
                                        <Chip color={triggerEnabled ? "success" : "danger"} variant="flat">
                                            {triggerEnabled ? "Yes" : "No"}
                                        </Chip>
                                    </div>

                                    {triggerEnabled && (
                                        <div className="space-y-3 mt-4">
                                            <div className="flex items-center gap-2">
                                                <Chip size="sm" color={triggerOnMention ? "success" : "danger"} variant="flat">
                                                    {triggerOnMention ? "✓" : "✗"}
                                                </Chip>
                                                <p>Respond to @mentions</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Chip size="sm" color={triggerOnDM ? "success" : "danger"} variant="flat">
                                                    {triggerOnDM ? "✓" : "✗"}
                                                </Chip>
                                                <p>Respond to direct messages</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Chip size="sm" color={triggerOnChannel ? "success" : "danger"} variant="flat">
                                                    {triggerOnChannel ? "✓" : "✗"}
                                                </Chip>
                                                <p>Respond to all channel messages</p>
                                            </div>

                                            {keywords && (
                                                <div className="mt-4">
                                                    <p className="text-sm text-default-500 mb-2">Keyword Triggers:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {keywords.split(',').map((keyword, index) => (
                                                            <Chip key={index} size="sm" variant="flat">
                                                                {keyword.trim()}
                                                            </Chip>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>

                            <Alert color="primary" className="mt-2">
                                <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    <p>
                                        When created, this agent will use the Slack token configured in your settings and
                                        will be associated with your current Slack workspace.
                                    </p>
                                </div>
                            </Alert>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    // Use different container classes depending on whether this is a modal or standalone page
    const containerClass = isStandalone
        ? "w-full mx-auto" // For standalone page
        : "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"; // For modal

    return (
        <div className={containerClass}>
            <div className={`${isStandalone ? "" : "max-w-[1200px] w-full mx-auto bg-background p-6 rounded-xl shadow-xl border border-default-200"}`}>
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left side - Steps */}
                    <div className="w-full md:w-1/3 lg:w-1/4">
                        <motion.div
                            className="sticky top-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="flex flex-col max-w-fit mb-2">
                                <h1 className="text-3xl font-bold text-default-900">Create Slack Agent</h1>
                                <p className="text-small text-default-400">
                                    Follow the steps to configure your Slack agent settings.
                                </p>
                            </div>
                            <Progress
                                classNames={{
                                    base: 'mb-4',
                                    track: 'drop-shadow-md',
                                    indicator: 'bg-gradient-to-r from-primary to-primary-500',
                                    label: 'text-sm font-medium',
                                    value: 'text-sm font-medium text-default-500',
                                }}
                                label="Progress"
                                size="md"
                                value={(activeStep / (steps.length - 1)) * 100}
                                showValueLabel={true}
                                valueLabel={`${activeStep + 1} of ${steps.length}`}
                            />

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

                            <div className="flex flex-col gap-4">
                                {steps.map((step, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => setActiveStep(index)}
                                        className={`flex flex-col gap-1 rounded-xl border-1 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                                            ${
                                                activeStep === index
                                                    ? 'border-primary bg-primary/5 shadow-md'
                                                    : index < activeStep
                                                      ? 'border-success/50 bg-success/5'
                                                      : 'border-default-200 dark:border-default-100'
                                            }
                                            ${index > activeStep ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        disabled={index > activeStep}
                                        whileHover={{
                                            scale: index <= activeStep ? 1.02 : 1,
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors duration-300
                                                    ${
                                                        activeStep === index
                                                            ? 'bg-primary text-white shadow-md'
                                                            : index < activeStep
                                                              ? 'bg-success text-white'
                                                              : 'bg-default-100 text-default-600'
                                                    }`}
                                            >
                                                {index < activeStep ? '✓' : index + 1}
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold text-default-900">{step}</span>
                                                {index === 0 && (
                                                    <span className="text-xs text-default-400">
                                                        Set name and description
                                                    </span>
                                                )}
                                                {index === 1 && (
                                                    <span className="text-xs text-default-400">
                                                        Choose a workflow to run
                                                    </span>
                                                )}
                                                {index === 2 && (
                                                    <span className="text-xs text-default-400">
                                                        Configure how the agent is triggered
                                                    </span>
                                                )}
                                                {index === 3 && (
                                                    <span className="text-xs text-default-400">
                                                        Review and create your agent
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right side - Content */}
                    <motion.div
                        className="flex-1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card className="bg-background/60 dark:bg-background/60 backdrop-blur-lg backdrop-saturate-150 shadow-xl border-1 border-default-200">
                            <CardBody className="gap-8 p-8">
                                {renderStepContent(activeStep)}

                                <Divider className="my-4" />

                                <div className="flex justify-between items-center">
                                    <Button
                                        color="danger"
                                        variant="light"
                                        onPress={onCancel}
                                        className="font-medium hover:bg-danger/10"
                                    >
                                        Cancel
                                    </Button>
                                    <div className="flex gap-3">
                                        {activeStep > 0 && (
                                            <Button
                                                variant="bordered"
                                                onPress={handleBack}
                                                className="font-medium"
                                                startContent={<ArrowLeft size={18} />}
                                                isDisabled={isSubmitting}
                                            >
                                                Back
                                            </Button>
                                        )}
                                        <Button
                                            color="primary"
                                            onPress={handleNext}
                                            className="font-medium"
                                            endContent={activeStep !== steps.length - 1 && <ArrowRight size={18} />}
                                            isLoading={isSubmitting}
                                            isDisabled={(activeStep === 0 && !name) || isSubmitting}
                                        >
                                            {activeStep === steps.length - 1 ? 'Create Agent' : 'Next'}
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default SlackAgentWizard