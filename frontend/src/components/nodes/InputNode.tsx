import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import BaseNode from './BaseNode';
import {
  setWorkflowInputVariable,
  deleteWorkflowInputVariable,
  updateWorkflowInputVariableKey,
} from '../../store/flowSlice';
import { Input, Button } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import styles from './InputNode.module.css';
import { useSaveWorkflow } from '../../hooks/useSaveWorkflow';
import { RootState } from '../../store/store';

interface InputNodeProps {
  id: string;
  data?: {
    title?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface WorkflowNode {
  id: string;
  [key: string]: any;
}

const InputNode: React.FC<InputNodeProps> = ({ id, data, ...props }) => {
  const dispatch = useDispatch();
  const workflowInputVariables = useSelector((state: RootState) => state.flow.workflowInputVariables);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [nodeWidth, setNodeWidth] = useState<string>('auto');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldValue, setNewFieldValue] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const workflowInputKeys = Object.keys(workflowInputVariables);

  useEffect(() => {
    if (nodeRef.current) {
      const maxLabelLength = Math.max(
        ...workflowInputKeys.map((label) => label.length),
        (data?.title || '').length / 1.5
      );

      const calculatedWidth = Math.max(300, maxLabelLength * 15);
      const finalWidth = Math.min(calculatedWidth, 600);

      setNodeWidth(`${finalWidth}px`);
    }
  }, [data, workflowInputKeys]);

  const saveWorkflow = useSaveWorkflow();
  const nodes = useSelector((state: RootState) => state.flow.nodes);

  const syncAndSave = useCallback(() => {
    const inputNode = nodes.find((node: WorkflowNode) => node.id === id);
    if (!inputNode) return;
    saveWorkflow();
  }, [id, nodes, saveWorkflow]);

  useEffect(() => {
    syncAndSave();
  }, [workflowInputVariables]);

  const handleAddWorkflowInputVariable = useCallback(() => {
    if (!newFieldValue.trim()) return;
    const newKey = newFieldValue.trim();

    dispatch(
      setWorkflowInputVariable({
        key: newKey,
        value: '',
      })
    );
    setNewFieldValue('');
  }, [dispatch, newFieldValue]);

  const handleDeleteWorkflowInputVariable = useCallback(
    (keyToDelete: string) => {
      dispatch(deleteWorkflowInputVariable({ key: keyToDelete }));
    },
    [dispatch]
  );

  const handleWorkflowInputVariableKeyEdit = useCallback(
    (oldKey: string, newKey: string) => {
      if (oldKey === newKey || !newKey.trim()) {
        setEditingField(null);
        return;
      }

      dispatch(updateWorkflowInputVariableKey({ oldKey, newKey }));
      setEditingField(null);
    },
    [dispatch]
  );

  const renderWorkflowInputs = () => {
    return (
      <div className={styles.handlesWrapper} id="handles">
        <div className={styles.handlesColumn}>
          {workflowInputKeys.length > 0 && (
            <table style={{ width: '100%' }}>
              <tbody>
                {workflowInputKeys.map((key) => (
                  <tr key={key} className="relative w-full px-4 py-2">
                    <td className={styles.handleLabelCell}>
                      {!isCollapsed && (
                        <div className="flex items-center gap-2">
                          {editingField === key ? (
                            <Input
                              autoFocus
                              defaultValue={key}
                              size="sm"
                              variant="faded"
                              radius="lg"
                              onBlur={(e) => {
                                const target = e.target as HTMLInputElement;
                                handleWorkflowInputVariableKeyEdit(key, target.value);
                              }}
                              onKeyDown={(e) => {
                                const target = e.target as HTMLInputElement;
                                if (e.key === 'Enter') {
                                  handleWorkflowInputVariableKeyEdit(key, target.value);
                                } else if (e.key === 'Escape') {
                                  setEditingField(null);
                                }
                              }}
                              classNames={{
                                input: 'bg-default-100',
                                inputWrapper: 'shadow-none',
                              }}
                            />
                          ) : (
                            <div className="flex flex-col w-full gap-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary`}
                                  onClick={() => setEditingField(key)}
                                >
                                  {key}
                                </span>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onClick={() => handleDeleteWorkflowInputVariable(key)}
                                >
                                  <Icon icon="solar:trash-bin-minimalistic-linear" width={16} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`${styles.handleCell} border-l border-default-300 w-0 ml-2`}>
                      <div className={styles.handleWrapper}>
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={key}
                          className={`${styles.handle} ${styles.handleRight} ${
                            isCollapsed ? styles.collapsedHandleOutput : ''
                          }`}
                          isConnectable={!isCollapsed}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderAddField = () =>
    !isCollapsed && (
      <div className="flex items-center gap-2 px-4 py-2">
        <Input
          placeholder="Enter new field name"
          value={newFieldValue}
          onChange={(e) => setNewFieldValue(e.target.value)}
          size="sm"
          variant="faded"
          radius="lg"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddWorkflowInputVariable();
            }
          }}
          classNames={{
            input: 'bg-default-100',
            inputWrapper: 'shadow-none',
          }}
          endContent={
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={handleAddWorkflowInputVariable}
              className="text-default-400 hover:text-default-500"
            >
              <Icon icon="solar:add-circle-bold" width={16} className="text-default-500" />
            </Button>
          }
        />
      </div>
    );

  return (
    <div className={styles.inputNodeWrapper}>
      <BaseNode
        id={id}
        type="input"
        isInputNode={true}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        data={{
          ...data,
          acronym: 'IN',
          color: '#2196F3',
        }}
        style={{ width: nodeWidth }}
        {...props}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          {renderWorkflowInputs()}
          {renderAddField()}
        </div>
      </BaseNode>
    </div>
  );
};

export default InputNode;