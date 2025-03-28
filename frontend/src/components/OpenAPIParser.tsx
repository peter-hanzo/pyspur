import { Button, Card, CardBody, CardHeader, Divider } from '@heroui/react'
import React, { useState } from 'react'

import { OpenAPIEndpoint } from '../types/openapi'
import { createOpenAPISpec } from '../utils/api'
import { parseOpenAPISpec } from '../utils/openApiParser'
import CodeEditor from './CodeEditor'
import EndpointDisplay from './EndpointDisplay'

const OpenAPIParser: React.FC = () => {
    const [jsonInput, setJsonInput] = useState('')
    const [endpoints, setEndpoints] = useState<OpenAPIEndpoint[]>([])
    const [error, setError] = useState<string | null>(null)
    const [parsedSpec, setParsedSpec] = useState<any>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Parse OpenAPI spec
    const handleParse = () => {
        const result = parseOpenAPISpec(jsonInput)
        setEndpoints(result.endpoints)
        setError(result.error)
        if (!result.error) {
            setParsedSpec(typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput)
        } else {
            setParsedSpec(null)
        }
        setSuccessMessage(null)
    }

    // Handle creation of spec
    const handleCreateSpec = async () => {
        try {
            if (parsedSpec) {
                await createOpenAPISpec(parsedSpec)
                setSuccessMessage('OpenAPI specification stored successfully!')
            }
        } catch (err) {
            setError('Failed to store OpenAPI specification')
        }
    }

    return (
        <Card className="w-full mb-10">
            <CardHeader>
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold">Store OpenAPI Specification</h3>
                    <p className="text-default-500">Parse and store OpenAPI specifications</p>
                </div>
            </CardHeader>
            <CardBody>
                <div className="flex flex-col gap-4">
                    <div className="w-full">
                        <CodeEditor
                            code={jsonInput}
                            onChange={setJsonInput}
                            mode="json"
                            label="OpenAPI Specification"
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <Button color="primary" onPress={handleParse} isDisabled={!jsonInput.trim()}>
                            Parse Specification
                        </Button>
                        <Button color="primary" onClick={handleCreateSpec} isDisabled={!parsedSpec}>
                            Store Specification
                        </Button>
                    </div>
                    {error && <div className="text-danger text-sm mt-1">{error}</div>}
                    {successMessage && <div className="text-success text-sm mt-1">{successMessage}</div>}

                    {endpoints.length > 0 && <EndpointDisplay endpoints={endpoints} />}
                </div>

                <Divider className="my-4" />
            </CardBody>
        </Card>
    )
}

export default OpenAPIParser
