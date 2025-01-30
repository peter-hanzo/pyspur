import React, { useState } from 'react'
import { Button, Chip, Input, listboxItem, Select, SelectItem } from '@heroui/react'
import { Icon } from '@iconify/react'
import { useDispatch } from 'react-redux'
import { deleteEdgeByHandle, updateEdgesOnHandleRename } from '../../../store/flowSlice'
import { convertToPythonVariableName } from '../../../utils/variableNameUtils'

export interface SchemaEditorProps {
    jsonValue: Record<string, any>
    onChange: (value: Record<string, any>) => void
    options: string[]
    schemaType: 'output_schema' | 'input_schema' | 'input_map' | 'output_map'
    nodeId: string
    availableFields?: string[]
    readOnly?: boolean
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({
    jsonValue,
    onChange,
    options,
    schemaType,
    nodeId,
    availableFields = ['string', 'boolean', 'integer', 'number', 'array', 'object', 'null'],
    readOnly = false,
}) => {
    const [newKey, setNewKey] = useState<string>('')
    const [newType, setNewType] = useState<string>(availableFields[0])
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editingValues, setEditingValues] = useState<Record<string, string>>({})
    const dispatch = useDispatch()

    const getPlaceholderExample = (): string => {
        return schemaType === 'input_schema' ? 'eg. article' : 'eg. summary'
    }

    const handleAddKey = (): void => {
        const validKey = convertToPythonVariableName(newKey)
        if (validKey && !jsonValue?.hasOwnProperty(validKey)) {
            const updatedJson = {
                ...jsonValue,
                [validKey]: newType,
            }
            onChange(updatedJson)
            setNewKey('')
            setNewType(availableFields[0])
        }
    }

    const handleRemoveKey = (key: string): void => {
        const { [key]: _, ...updatedJson } = jsonValue
        onChange(updatedJson)
        dispatch(deleteEdgeByHandle({ nodeId, handleKey: key }))
    }

    const getType = (value: any): string => {
        if (typeof value === 'object' && value !== null) {
            return value.type || 'string'
        }
        return value
    }

    const handleKeyEdit = (oldKey: string, newKey: string): void => {
        const validKey = convertToPythonVariableName(newKey)
        if (oldKey === validKey || !validKey.trim()) {
            setEditingField(null)
            setEditingValues((prev) => {
                const { [oldKey]: _, ...rest } = prev
                return rest
            })
            return
        }

        const updatedJson: Record<string, string> = {}
        Object.entries(jsonValue).forEach(([key, value]) => {
            if (key === oldKey) {
                updatedJson[validKey] = getType(value)
            } else {
                updatedJson[key] = getType(value)
            }
        })

        onChange(updatedJson)
        if (validKey && oldKey && schemaType !== 'input_map' && schemaType !== 'output_map') {
            dispatch(
                updateEdgesOnHandleRename({
                    nodeId,
                    oldHandleId: oldKey,
                    newHandleId: validKey,
                    schemaType,
                })
            )
        }
        setEditingField(null)
        setEditingValues((prev) => {
            const { [oldKey]: _, ...rest } = prev
            return rest
        })
    }

    const label = schemaType === 'input_map' || schemaType === 'output_map' ? 'Field' : 'Type'

    return (
        <div className={`schema-editor ${readOnly ? 'opacity-75 cursor-not-allowed' : ''}`}>
            {!readOnly && (
                <div className="mb-4 flex items-center space-x-4">
                    <Input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(convertToPythonVariableName(e.target.value))}
                        onBlur={(e) => setNewKey(convertToPythonVariableName(e.target.value))}
                        placeholder={getPlaceholderExample()}
                        label="Name"
                        disabled={readOnly}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !readOnly && newKey) {
                                e.currentTarget.blur()
                                handleAddKey()
                            }
                        }}
                        className="p-2 flex-grow w-2/3"
                    />
                    <Select
                        onChange={(e) => setNewType(e.target.value)}
                        disabled={readOnly}
                        label={label}
                        defaultSelectedKeys={[availableFields[0]]}
                        className="max-w-xs p-2 w-1/3"
                        isMultiline={true}
                        renderValue={(items) => (
                            <div>
                                {items.map((item) => (
                                    <Chip key={item.key} size="sm">
                                        {item.textValue}
                                    </Chip>
                                ))}
                            </div>
                        )}
                    >
                        {availableFields.map((field) => (
                            <SelectItem key={field} value={field}>
                                {field}
                            </SelectItem>
                        ))}
                    </Select>
                    <Button
                        isIconOnly
                        radius="full"
                        variant="light"
                        onClick={handleAddKey}
                        color="primary"
                        disabled={readOnly || !newKey}
                    >
                        <Icon icon="solar:add-circle-linear" width={22} />
                    </Button>
                </div>
            )}
            {jsonValue &&
                typeof jsonValue === 'object' &&
                !Array.isArray(jsonValue) &&
                Object.entries(jsonValue).map(([key, value]) => (
                    <div key={key} className="mb-2 flex items-center">
                        {editingField === key && !readOnly ? (
                            <Input
                                autoFocus
                                defaultValue={key}
                                value={editingValues[key] || key}
                                size="sm"
                                variant="faded"
                                radius="lg"
                                onFocus={(e) => setEditingValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                onBlur={(e) => handleKeyEdit(key, editingValues[key])}
                                onChange={(e) => {
                                    const pythonVarName = convertToPythonVariableName(e.target.value)
                                    setEditingValues((prev) => ({ ...prev, [key]: pythonVarName }))
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur()
                                    } else if (e.key === 'Escape') {
                                        setEditingField(null)
                                        setEditingValues((prev) => {
                                            const { [key]: _, ...rest } = prev
                                            return rest
                                        })
                                    }
                                }}
                                classNames={{
                                    input: 'bg-default-100',
                                    inputWrapper: 'shadow-none',
                                }}
                                className="w-40"
                            />
                        ) : (
                            <span
                                className={`mr-2 p-1 border rounded-full bg-default-100 ${!readOnly ? 'hover:bg-default-200 cursor-pointer' : ''}`}
                                onClick={() => !readOnly && setEditingField(key)}
                            >
                                {key}
                            </span>
                        )}
                        <span className="mr-2">{getType(value)}</span>
                        {!readOnly && (
                            <Button
                                isIconOnly
                                radius="full"
                                variant="light"
                                onClick={() => handleRemoveKey(key)}
                                color="primary"
                            >
                                <Icon icon="solar:trash-bin-trash-linear" width={22} />
                            </Button>
                        )}
                    </div>
                ))}
        </div>
    )
}

export default SchemaEditor
