import { Card, CardBody, Divider } from '@heroui/react'
import React from 'react'

interface Parameter {
    name: string
    description?: string
    required: boolean
    type: string
    schema?: any
    format?: string
    items?: any
    enum?: string[]
    in: 'path' | 'query' | 'body' | 'formData' | 'header'
}

interface OpenAPIEndpoint {
    path: string
    method: string
    summary?: string
    operationId?: string
    description?: string
    parameters: Parameter[]
    input_schema: any
    output_schema: any
}

interface EndpointDisplayProps {
    endpoints: OpenAPIEndpoint[]
}

const EndpointDisplay: React.FC<EndpointDisplayProps> = ({ endpoints }) => {
    const renderSchemaProperties = (schema: any, level: number = 0): JSX.Element | null => {
        if (!schema) return null

        // Handle top-level array schema
        if (schema.type === 'array' && schema.items) {
            return (
                <div style={{ marginLeft: `${level * 20}px` }}>
                    <div className="font-mono">
                        Array of <span className="text-blue-600">{schema.items.type || 'object'}</span>
                    </div>
                    <div className="ml-4">
                        {schema.items.type === 'object' ? (
                            renderSchemaProperties(schema.items, level + 1)
                        ) : (
                            <div className="text-sm text-gray-600">
                                {schema.items.description || 'No description available'}
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        // Handle map/dictionary schema (with additionalProperties)
        if (schema.type === 'object' && schema.additionalProperties) {
            return (
                <div style={{ marginLeft: `${level * 20}px` }}>
                    <div className="font-mono">
                        Map of <span className="text-gray-500">string</span> to{' '}
                        <span className="text-blue-600">
                            {schema.additionalProperties.type}
                            {schema.additionalProperties.format && ` (${schema.additionalProperties.format})`}
                        </span>
                    </div>
                    {schema.additionalProperties.description && (
                        <div className="text-sm text-gray-600 ml-4">{schema.additionalProperties.description}</div>
                    )}
                    {schema.additionalProperties.type === 'object' && (
                        <div className="ml-4">{renderSchemaProperties(schema.additionalProperties, level + 1)}</div>
                    )}
                </div>
            )
        }

        // Handle regular object schema
        if (!schema.properties) return null

        return (
            <div style={{ marginLeft: `${level * 20}px` }}>
                {Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => (
                    <div key={propName} className="mb-2">
                        <div className="font-mono">
                            {propName}
                            {schema.required?.includes(propName) && <span className="text-red-500">*</span>}:{' '}
                            <span className="text-blue-600">{propSchema.type}</span>
                            {propSchema.format && <span className="text-gray-500"> ({propSchema.format})</span>}
                            {propSchema.enum && (
                                <span className="text-gray-500"> enum: [{propSchema.enum.join(', ')}]</span>
                            )}
                        </div>
                        {propSchema.description && (
                            <div className="text-sm text-gray-600 ml-4">{propSchema.description}</div>
                        )}
                        {propSchema.type === 'object' && renderSchemaProperties(propSchema, level + 1)}
                        {propSchema.type === 'array' && propSchema.items && (
                            <div className="ml-4">
                                <div className="text-sm text-gray-600">Array items:</div>
                                {renderSchemaProperties(propSchema.items, level + 1)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    const renderParameterGroup = (parameters: Parameter[], title: string): JSX.Element | null => {
        if (!parameters.length) return null

        // Special handling for body parameters
        if (title === 'Body Parameters') {
            const bodyParam = parameters[0] // There should only be one body parameter
            return (
                <div className="mb-4">
                    <h6 className="text-md font-semibold mb-2">{title}</h6>
                    <div className="pl-4">
                        {bodyParam.description && (
                            <div className="text-sm text-gray-600 mb-2">{bodyParam.description}</div>
                        )}
                        {bodyParam.schema && renderSchemaProperties(bodyParam.schema)}
                    </div>
                </div>
            )
        }

        // Regular parameter groups (path, query, form, header)
        return (
            <div className="mb-4">
                <h6 className="text-md font-semibold mb-2">{title}</h6>
                <div className="space-y-4">
                    {parameters.map((param, index) => (
                        <div key={`${param.name}-${index}`} className="pl-4">
                            <div className="font-mono">
                                {param.name}
                                {param.required && <span className="text-red-500">*</span>}:{' '}
                                <span className="text-blue-600">{param.type}</span>
                                {param.format && <span className="text-gray-500"> ({param.format})</span>}
                                {param.enum && <span className="text-gray-500"> enum: [{param.enum.join(', ')}]</span>}
                            </div>
                            {param.description && <div className="text-sm text-gray-600 ml-4">{param.description}</div>}
                            {param.schema && <div className="mt-2">{renderSchemaProperties(param.schema)}</div>}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const renderParameters = (parameters: Parameter[]): JSX.Element | null => {
        if (!parameters.length) return null

        const pathParams = parameters.filter((p) => p.in === 'path')
        const queryParams = parameters.filter((p) => p.in === 'query')
        const formParams = parameters.filter((p) => p.in === 'formData')
        const bodyParams = parameters.filter((p) => p.in === 'body')
        const headerParams = parameters.filter((p) => p.in === 'header')

        return (
            <div className="mb-4">
                <h5 className="text-md font-semibold mb-3">Parameters</h5>
                <div className="space-y-4 pl-4">
                    {pathParams.length > 0 && renderParameterGroup(pathParams, 'Path Parameters')}
                    {queryParams.length > 0 && renderParameterGroup(queryParams, 'Query Parameters')}
                    {formParams.length > 0 && renderParameterGroup(formParams, 'Form Parameters')}
                    {headerParams.length > 0 && renderParameterGroup(headerParams, 'Header Parameters')}
                    {bodyParams.length > 0 && renderParameterGroup(bodyParams, 'Body Parameters')}
                </div>
            </div>
        )
    }

    const renderSchema = (schema: any, title: string): JSX.Element | null => {
        if (!schema) return null

        return (
            <div className="mb-4">
                <h5 className="text-md font-semibold mb-3">{title}</h5>
                <div className="pl-4">{renderSchemaProperties(schema)}</div>
            </div>
        )
    }

    return (
        <div className="mt-4">
            <h4 className="text-lg font-semibold mb-4">Available Endpoints</h4>
            <div className="space-y-4">
                {endpoints.map((endpoint, index) => (
                    <Card key={`${endpoint.method}-${endpoint.path}-${index}`}>
                        <CardBody>
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className={`px-2 py-1 rounded text-sm font-medium
                                    ${
                                        endpoint.method === 'GET'
                                            ? 'bg-blue-100 text-blue-800'
                                            : endpoint.method === 'POST'
                                              ? 'bg-green-100 text-green-800'
                                              : endpoint.method === 'PUT'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : endpoint.method === 'DELETE'
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    {endpoint.method}
                                </span>
                                <span className="font-mono">{endpoint.path}</span>
                            </div>

                            {(endpoint.summary || endpoint.description) && (
                                <>
                                    {endpoint.summary && (
                                        <div className="text-lg font-medium mb-2">{endpoint.summary}</div>
                                    )}
                                    {endpoint.description && (
                                        <div className="text-gray-600 mb-4">{endpoint.description}</div>
                                    )}
                                    <Divider className="my-4" />
                                </>
                            )}

                            <div className="space-y-4">
                                {/* Parameters */}
                                {renderParameters(endpoint.parameters)}

                                {/* Input Schema */}
                                {endpoint.input_schema && renderSchema(endpoint.input_schema, 'Request Body Schema')}

                                {/* Output Schema */}
                                {endpoint.output_schema && renderSchema(endpoint.output_schema, 'Response Schema')}
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default EndpointDisplay
