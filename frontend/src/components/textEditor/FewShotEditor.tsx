import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import TextEditor from './TextEditor'
import { updateNodeConfigOnly } from '../../store/flowSlice'
import { Button, Tabs, Tab } from '@heroui/react'
import _ from 'lodash'
import { RootState } from '../../store/store'

interface FewShotExample {
    input?: string
    output?: string
}

interface NodeData {
    config?: {
        few_shot_examples?: FewShotExample[]
    }
    [key: string]: any
}

interface Node {
    id: string
    data: NodeData
}

interface InputOutputTabsProps {
    activeTab: 'input' | 'output'
    setActiveTab: (tab: 'input' | 'output') => void
}

const InputOutputTabs: React.FC<InputOutputTabsProps> = ({ activeTab, setActiveTab }) => {
    return (
        <div className="mb-5">
            <div className="flex w-full flex-col items-center">
                <Tabs
                    aria-label="Input/Output Options"
                    selectedKey={activeTab}
                    onSelectionChange={(key) => setActiveTab(key as 'input' | 'output')}
                >
                    <Tab key="input" title="Input" />
                    <Tab key="output" title="Output" />
                </Tabs>
            </div>
        </div>
    )
}

interface FewShotEditorProps {
    nodeID: string
    exampleIndex: number
    onSave: () => void
    onDiscard: () => void
}

const FewShotEditor: React.FC<FewShotEditorProps> = ({ nodeID, exampleIndex, onSave, onDiscard }) => {
    const dispatch = useDispatch()
    const nodeConfig = useSelector((state: RootState) => state.flow.nodeConfigs[nodeID])
    const [activeTab, setActiveTab] = useState<'input' | 'output'>('input')

    const handleContentChange = (content: string) => {
        (dispatch as any)((dispatch: any, getState: any) => {
            const currentNodeConfig = getState().flow.nodeConfigs[nodeID] || {};
            const updatedExamples = _.cloneDeep(currentNodeConfig.few_shot_examples || []);

            if (!updatedExamples[exampleIndex]) {
                updatedExamples[exampleIndex] = {};
            }

            // Update the content for the active tab (input/output)
            updatedExamples[exampleIndex][activeTab] = content;

            // Dispatch the updated data to Redux
            dispatch(
                updateNodeConfigOnly({
                    id: nodeID,
                    data: {
                        few_shot_examples: updatedExamples
                    }
                })
            );
        });
    }

    return (
        <div className="w-full px-4 py-10 my-10 bg-content1 dark:bg-content1 rounded-lg shadow-sm">
            <InputOutputTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="mb-2 font-medium text-foreground">
                Example {exampleIndex + 1} {activeTab}
            </div>
            <TextEditor
                key={`${activeTab}-${exampleIndex}`}
                content={nodeConfig?.few_shot_examples?.[exampleIndex]?.[activeTab] || ''}
                setContent={handleContentChange}
                isEditable={true}
                fieldTitle={`Example ${exampleIndex + 1} ${activeTab}`}
                nodeID={nodeID}
                fieldName={`few_shot_examples[${exampleIndex}][${activeTab}]`}
            />

            <div className="mt-4 flex gap-2">
                <Button onPress={onDiscard} color="primary" variant="flat">
                    Discard
                </Button>
                <Button onPress={onSave} color="primary" variant="solid">
                    Save
                </Button>
            </div>
        </div>
    )
}

export default FewShotEditor
