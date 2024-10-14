import React, { useState } from 'react';
import { Tabs, Tab, Button } from '@nextui-org/react'; // Updated import
import { RiAddCircleFill } from '@remixicon/react'; // Importing the icon

const TabbedFooter = ({ activeTab, setActiveTab }) => {
  const [tabs, setTabs] = useState([
    { key: 'sheet1', title: 'Sheet 1' },
    { key: 'sheet2', title: 'Sheet 2' },
  ]);

  const addTab = () => {
    const newIndex = tabs.length + 1;
    const newTab = { key: `sheet${newIndex}`, title: `Sheet ${newIndex}` };
    setTabs([...tabs, newTab]);
  };

  return (
    <div className="flex w-full flex-col bg-white shadow-md">
      <div className="flex items-center">
        <Button auto flat onClick={addTab} className='bg-white'>
          <RiAddCircleFill /> {/* Add icon for adding tabs */}
        </Button>
        <Tabs
          aria-label="Options"
          selectedKey={activeTab} // Manage active tab state
          onSelectionChange={(key) => setActiveTab(key)} // Set active tab on click
        >
          {tabs.map((tab) => (
            <Tab key={tab.key} title={tab.title}>
              {/* Content for {tab.title} */}
            </Tab>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default TabbedFooter;
