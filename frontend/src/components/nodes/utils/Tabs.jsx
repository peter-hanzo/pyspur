import React from 'react';
import { Tabs, Tab } from '@nextui-org/react'; // Assuming you're using @nextui-org for Tabs

const InputOutputTabs = ({ activeTab, setActiveTab }) => {
    return (
        <div className='mb-5'>
        <div className="flex w-full flex-col items-center">
            <Tabs
                aria-label="Input/Output Options"
                selectedKey={activeTab} // Manage active tab state
                onSelectionChange={(key) => setActiveTab(key)} // Set active tab on click
            >
                <Tab key="input" title="Input">
                    {/* Content for Input */}
                </Tab>
                <Tab key="output" title="Output">
                    {/* Content for Output */}
                </Tab>
            </Tabs>
        </div>
        </div>
    );
};

export default InputOutputTabs;
