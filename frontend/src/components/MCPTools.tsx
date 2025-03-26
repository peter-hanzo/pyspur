import { Button, Card, Input, Select, SelectItem, Tab, Tabs } from '@heroui/react'
import React, { useState } from 'react'

const mockMcpServers = [
    { id: 1, name: 'Weather API', type: 'stdio', description: 'Get weather information' },
    { id: 2, name: 'Stock Data', type: 'http', description: 'Retrieve stock market data' },
]

const MCPTools: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState('my-server')

    return (
        <div className="w-full">
            <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key.toString())}>
                <Tab key="my-server" title="My Server">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {mockMcpServers.map((server) => (
                            <Card key={server.id} className="p-4">
                                <h4 className="font-medium text-lg">{server.name}</h4>
                                <p className="text-default-500 text-sm mt-1">Type: {server.type}</p>
                                <p className="text-default-500 text-sm mt-1">{server.description}</p>
                                <div className="flex gap-2 mt-3">
                                    <Button size="sm" color="primary">
                                        Configure
                                    </Button>
                                    <Button size="sm" color="danger">
                                        Remove
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </Tab>
                <Tab key="connect" title="Connect to Server">
                    <div className="max-w-xl mx-auto mt-4">
                        <Card className="p-6">
                            <h3 className="text-xl font-semibold mb-4">Connect MCP Server</h3>
                            <div className="space-y-4">
                                <div>
                                    <Input
                                        type="text"
                                        label="Name"
                                        placeholder="Example: Stripe"
                                        labelPlacement="outside"
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <Select
                                        label="Type"
                                        placeholder="Select a type"
                                        labelPlacement="outside"
                                        className="w-full"
                                    >
                                        <SelectItem key="stdio" value="stdio">
                                            stdio
                                        </SelectItem>
                                        <SelectItem key="http" value="http">
                                            http
                                        </SelectItem>
                                    </Select>
                                </div>
                                <div>
                                    <Input
                                        type="text"
                                        label="Command"
                                        placeholder="Example: npx -y @stripe/mcp --tools=all --api-key=YOUR_STRIPE_SECRET_KEY"
                                        labelPlacement="outside"
                                        className="w-full"
                                    />
                                </div>
                                <Button color="primary" className="w-full">
                                    Connect
                                </Button>
                            </div>
                        </Card>
                    </div>
                </Tab>
            </Tabs>
        </div>
    )
}

export default MCPTools
