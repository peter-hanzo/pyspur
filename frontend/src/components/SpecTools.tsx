import { Tab, Tabs } from '@heroui/react'
import React, { useState } from 'react'

import OpenAPIParser from './OpenAPIParser'
import RegisteredSpecs from './RegisteredSpecs'

interface SpecToolsProps {
    onSpecCreated: (endpoints: any[], fullSpec: any) => void
}

const SpecTools: React.FC<SpecToolsProps> = ({ onSpecCreated }) => {
    const [selectedTab, setSelectedTab] = useState('create')

    return (
        <div className="w-full">
            <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key.toString())}>
                <Tab key="create" title="Create New">
                    <div className="py-4">
                        <OpenAPIParser />
                    </div>
                </Tab>
                <Tab key="registered" title="Registered">
                    <div className="py-4">
                        <RegisteredSpecs />
                    </div>
                </Tab>
            </Tabs>
        </div>
    )
}

export default SpecTools
