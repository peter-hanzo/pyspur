import { Alert, Button, Card, CardBody, Tab, Tabs, Tooltip } from '@heroui/react'
import { Icon } from '@iconify/react'
import React from 'react'
import { jsonOptions } from '../../../constants/jsonOptions'
import { extractSchemaFromJsonSchema, generateJsonSchemaFromSchema } from '../../../utils/schemaUtils'
import CodeEditor from '../../CodeEditor'
import SchemaEditor from './SchemaEditor'

interface OutputSchemaEditorProps {
    nodeID: string
    currentNodeConfig: any
    jsonSchemaError: string
    handleInputChange: (key: string, value: any) => void
    debouncedValidate: (value: string) => void
    setCurrentNodeConfig: (updater: (prev: any) => any) => void
    dispatch: any
    updateNodeConfigOnly: any
    isLast?: boolean
}

const OutputSchemaEditor: React.FC<OutputSchemaEditorProps> = ({
    nodeID,
    currentNodeConfig,
    jsonSchemaError,
    handleInputChange,
    debouncedValidate,
    setCurrentNodeConfig,
    dispatch,
    updateNodeConfigOnly,
    isLast = false,
}) => {
    const { schema: parsedSchema } = extractSchemaFromJsonSchema(currentNodeConfig.output_json_schema || '')

    return (
        <div key="output_json_schema">
            <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">Output Schema</h3>
                <Tooltip
                    content={
                        currentNodeConfig?.has_fixed_output === true
                            ? "This node has a fixed output schema that cannot be modified. The JSON schema provides detailed validation rules for the node's output."
                            : currentNodeConfig?.llm_info?.model && currentNodeConfig?.llm_info?.supports_JSON_output
                              ? "Define the structure of this node's output. You can use either the Simple Editor for basic types, or the JSON Schema Editor for more complex validation rules."
                              : currentNodeConfig?.llm_info?.model && !currentNodeConfig?.llm_info?.supports_JSON_output
                                ? "This model only supports a fixed output schema with a single 'output' field of type string. Schema editing is disabled."
                                : "The output schema defines the structure of this node's output."
                    }
                    placement="left-start"
                    showArrow={true}
                    className="max-w-xs"
                >
                    <Icon icon="solar:question-circle-linear" className="text-default-400 cursor-help" width={20} />
                </Tooltip>
                {!currentNodeConfig?.has_fixed_output && currentNodeConfig?.llm_info?.model && (
                    <Button
                        isIconOnly
                        radius="full"
                        variant="light"
                        size="sm"
                        onClick={() => {
                            const defaultSchema = {
                                type: 'object',
                                properties: {
                                    output: { type: 'string' },
                                },
                                required: ['output'],
                            }
                            handleInputChange('output_json_schema', JSON.stringify(defaultSchema, null, 2))
                        }}
                    >
                        <Icon icon="solar:restart-linear" width={20} />
                    </Button>
                )}
            </div>
            {currentNodeConfig?.has_fixed_output ? (
                <div className="bg-default-100 rounded-lg p-4">
                    <CodeEditor
                        key={`code-editor-output-json-schema-${nodeID}`}
                        code={currentNodeConfig.output_json_schema || ''}
                        mode="json"
                        onChange={() => {}} // No-op for fixed output nodes
                        readOnly={true}
                    />
                    <p className="text-sm text-default-500 mt-2">
                        This node has a fixed output schema that cannot be modified.
                    </p>
                </div>
            ) : currentNodeConfig?.llm_info?.model ? (
                <>
                    {jsonSchemaError && (
                        <Alert color="danger" className="mb-2">
                            <div className="flex items-center gap-2">
                                <span>{jsonSchemaError}</span>
                            </div>
                        </Alert>
                    )}
                    <Tabs aria-label="Schema Editor Options" disabledKeys={jsonSchemaError ? ['simple'] : []}>
                        <Tab key="simple" title="Simple Editor">
                            {parsedSchema && (
                                <Card>
                                    <CardBody>
                                        <SchemaEditor
                                            key={`schema-editor-output-${nodeID}`}
                                            jsonValue={parsedSchema}
                                            onChange={(newValue) => {
                                                if (typeof newValue === 'object' && !('type' in newValue)) {
                                                    const jsonSchema = generateJsonSchemaFromSchema(newValue)
                                                    if (jsonSchema) {
                                                        const updates = {
                                                            output_json_schema: jsonSchema,
                                                        }
                                                        setCurrentNodeConfig((prev) => ({
                                                            ...prev,
                                                            ...updates,
                                                        }))
                                                        dispatch(
                                                            updateNodeConfigOnly({
                                                                id: nodeID,
                                                                data: {
                                                                    ...currentNodeConfig,
                                                                    ...updates,
                                                                },
                                                            })
                                                        )
                                                    }
                                                } else {
                                                    const updates = {
                                                        output_json_schema: JSON.stringify(newValue, null, 2),
                                                    }
                                                    setCurrentNodeConfig((prev) => ({
                                                        ...prev,
                                                        ...updates,
                                                    }))
                                                    dispatch(
                                                        updateNodeConfigOnly({
                                                            id: nodeID,
                                                            data: {
                                                                ...currentNodeConfig,
                                                                ...updates,
                                                            },
                                                        })
                                                    )
                                                }
                                            }}
                                            options={jsonOptions}
                                            nodeId={nodeID}
                                        />
                                    </CardBody>
                                </Card>
                            )}
                        </Tab>
                        <Tab key="json" title="JSON Schema">
                            <Card>
                                <CardBody>
                                    <CodeEditor
                                        key={`code-editor-output-json-schema-${nodeID}`}
                                        code={currentNodeConfig.output_json_schema || ''}
                                        mode="json"
                                        onChange={(value: string) => {
                                            handleInputChange('output_json_schema', value)
                                            debouncedValidate(value)
                                        }}
                                    />
                                </CardBody>
                            </Card>
                        </Tab>
                    </Tabs>
                </>
            ) : (
                <></>
            )}
            {!isLast && <hr className="my-2" />}
        </div>
    )
}

export default OutputSchemaEditor
