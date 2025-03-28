import { Button, Card, CardBody, CardHeader } from '@heroui/react'
import React, { useEffect, useState } from 'react'

import { OpenAPISpec } from '../types/openapi'
import { deleteOpenAPISpec, listOpenAPISpecs } from '../utils/api'
import { parseOpenAPISpec } from '../utils/openApiParser'
import EndpointDisplay from './EndpointDisplay'

const RegisteredSpecs: React.FC = () => {
    const [specs, setSpecs] = useState<OpenAPISpec[]>([])
    const [expandedSpec, setExpandedSpec] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSpecs = async () => {
        try {
            setLoading(true)
            const response = await listOpenAPISpecs()
            const parsedSpecs = response.map((spec: any) => {
                const parseResult = parseOpenAPISpec(spec.raw_spec)
                return {
                    ...spec,
                    endpoints: parseResult.endpoints,
                }
            })
            setSpecs(parsedSpecs)
            setError(null)
        } catch (err) {
            setError('Failed to load registered specifications')
            console.error('Error loading specs:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSpecs()
    }, [])

    const handleDelete = async (specId: string) => {
        try {
            await deleteOpenAPISpec(specId)
            await fetchSpecs()
        } catch (err) {
            setError('Failed to delete specification')
            console.error('Error deleting spec:', err)
        }
    }

    if (loading) {
        return <div className="text-center py-4">Loading specifications...</div>
    }

    if (error) {
        return <div className="text-danger text-center py-4">{error}</div>
    }

    if (specs.length === 0) {
        return <div className="text-center py-4">No registered specifications found</div>
    }

    return (
        <div className="flex flex-col gap-4">
            {specs.map((spec) => (
                <Card key={spec.id} className="w-full">
                    <CardHeader className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-semibold">{spec.name}</h3>
                            <p className="text-default-500 text-sm">Version: {spec.version}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                            <Button
                                color="primary"
                                variant="light"
                                onPress={() => setExpandedSpec(expandedSpec === spec.id ? null : spec.id)}
                            >
                                {expandedSpec === spec.id ? 'Collapse' : 'Expand'}
                            </Button>
                            <Button color="danger" variant="light" onPress={() => handleDelete(spec.id)}>
                                Delete
                            </Button>
                        </div>
                    </CardHeader>
                    {expandedSpec === spec.id && (
                        <CardBody>
                            {spec.description && (
                                <div className="mb-4">
                                    <p className="text-default-700">{spec.description}</p>
                                </div>
                            )}
                            <EndpointDisplay endpoints={spec.endpoints} />
                        </CardBody>
                    )}
                </Card>
            ))}
        </div>
    )
}

export default RegisteredSpecs
