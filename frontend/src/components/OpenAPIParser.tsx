import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Selection,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from '@heroui/react'
import React, { useState } from 'react'
import CodeEditor from './CodeEditor'

interface OpenAPIEndpoint {
    path: string
    method: string
    summary?: string
    operationId?: string
}

interface OpenAPIParserProps {
    onEndpointsSelected: (endpoints: OpenAPIEndpoint[], fullSpec: any) => void
}

const OpenAPIParser: React.FC<OpenAPIParserProps> = ({ onEndpointsSelected }) => {
    const [jsonInput, setJsonInput] = useState('')
    const [endpoints, setEndpoints] = useState<OpenAPIEndpoint[]>([])
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]))
    const [error, setError] = useState<string | null>(null)
    const [parsedSpec, setParsedSpec] = useState<any>(null)

    const parseOpenAPI = () => {
        try {
            const spec = JSON.parse(jsonInput)
            const parsedEndpoints: OpenAPIEndpoint[] = []

            // Parse paths and methods from OpenAPI spec
            Object.entries(spec.paths || {}).forEach(([path, pathObj]: [string, any]) => {
                Object.entries(pathObj).forEach(([method, methodObj]: [string, any]) => {
                    parsedEndpoints.push({
                        path,
                        method: method.toUpperCase(),
                        summary: methodObj.summary,
                        operationId: methodObj.operationId,
                    })
                })
            })

            setEndpoints(parsedEndpoints)
            setParsedSpec(spec)
            setError(null)
        } catch (err) {
            setError('Invalid OpenAPI specification. Please check your JSON.')
            setEndpoints([])
            setParsedSpec(null)
        }
    }

    const handleCreateNodes = () => {
        const selectedEndpointsList = endpoints.filter(
            (_, index) => selectedKeys === 'all' || (selectedKeys as Set<string>).has(index.toString())
        )
        onEndpointsSelected(selectedEndpointsList, parsedSpec)
    }

    return (
        <Card className="w-full mb-10">
            <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold">OpenAPI Specification Parser</h3>
                    <p className="text-default-500">
                        Paste your OpenAPI specification JSON to generate nodes for the selected endpoints.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="w-[800px]">
                        <CodeEditor code={jsonInput} onChange={setJsonInput} mode="json" label="OpenAPI Specification" />
                    </div>
                    <Button color="primary" onPress={parseOpenAPI} className="w-fit" isDisabled={!jsonInput.trim()}>
                        Parse Specification
                    </Button>
                    {error && <div className="text-danger text-sm mt-1">{error}</div>}
                </div>
            </CardHeader>
            {endpoints.length > 0 && (
                <CardBody>
                    <Table
                        aria-label="OpenAPI Endpoints"
                        selectionMode="multiple"
                        selectedKeys={selectedKeys}
                        onSelectionChange={setSelectedKeys}
                        className="w-full"
                    >
                        <TableHeader>
                            <TableColumn>Method</TableColumn>
                            <TableColumn>Path</TableColumn>
                            <TableColumn>Summary</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {endpoints.map((endpoint, index) => (
                                <TableRow key={index}>
                                    <TableCell>{endpoint.method}</TableCell>
                                    <TableCell>{endpoint.path}</TableCell>
                                    <TableCell>{endpoint.summary || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                        <Button
                            color="primary"
                            onClick={handleCreateNodes}
                            isDisabled={selectedKeys === 'all' ? false : (selectedKeys as Set<string>).size === 0}
                        >
                            Create Nodes for Selected Endpoints
                        </Button>
                    </div>
                </CardBody>
            )}
        </Card>
    )
}

export default OpenAPIParser
