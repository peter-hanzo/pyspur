import React from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { Card, Popover, PopoverTrigger, PopoverContent, Button } from '@nextui-org/react';
import { useNodeSelector } from '../../../../hooks/useNodeSelector';

const Control = () => {
  const { visible, setVisible, handleSelectNode } = useNodeSelector();

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <Popover placement="bottom" showArrow={true} isOpen={visible} onOpenChange={setVisible}>
          <PopoverTrigger>
            <Button auto light>
              <RiAddCircleFill />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className='p-4 flex flex-col space-y-2'>
              <div className='flex flex-col space-y-2'>
                <h3 className='text-sm font-semibold'>Blocks</h3>
                <Button auto light onClick={() => handleSelectNode('BasicLLMNode')}>Basic LLM Node</Button>
                <Button auto light onClick={() => handleSelectNode('StructuredOutputLLMNode')}>Structured Output LLM Node</Button>
                <Button auto light onClick={() => handleSelectNode('PythonFuncNode')}>Python Function Node</Button>
                <Button auto light onClick={() => handleSelectNode('LLM')}>LLM</Button>
                <Button auto light onClick={() => handleSelectNode('Knowledge Retrieval')}>Knowledge Retrieval</Button>
                <Button auto light onClick={() => handleSelectNode('End')}>End</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};

export default Control;
