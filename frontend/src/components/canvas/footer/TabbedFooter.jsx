import React, { useState } from 'react';
import { Tabs, Tab, Button } from '@nextui-org/react'; // Updated import
import { RiAddCircleFill } from '@remixicon/react'; // Importing the icon

const TabbedFooter = () => {
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
    <div className="flex w-full flex-col bg-white shadow-md"> {/* Added bg-white and shadow-md for non-transparency */}
      <div className="flex items-center">
        <Button auto flat onClick={addTab} className='bg-white'> {/* Moved button to the left */}
          <RiAddCircleFill /> {/* Replaced + with the icon */}
        </Button>
        <Tabs aria-label="Options">
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