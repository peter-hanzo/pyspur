import React, { useState } from 'react'
import { Button, Chip, Input, Select, SelectItem } from '@heroui/react'
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

interface FieldProps {
    path: string[]
    value: any
    onUpdate: (path: string[], value: any) => void
    onDelete: (path: string[]) => void
    readOnly?: boolean
    availableFields: string[]
    level: number
}

const SchemaField: React.FC<FieldProps> = ({
    path,
    value,
    onUpdate,
    onDelete,
    readOnly,
    availableFields,
    level,
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(path[path.length - 1])
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation()
        e.dataTransfer.setData(
            'text/plain',
            JSON.stringify({
                path,
                value,
                fieldName: path[path.length - 1],
            })
        )
    }

    const handleDragOver = (e: React.DragEvent) => {
        const type = getTypeFromValue(value)
        if (type === 'object') {
            e.preventDefault()
            e.stopPropagation()
            setIsDragOver(true)
        }
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.stopPropagation()
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)

        // Ensure drop is only allowed on fields that are objects.
        const targetType = getTypeFromValue(value)
        if (targetType !== 'object') {
            return
        }

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'))
            if (data.path.join('.') !== path.join('.')) {
                onUpdate(path, {
                    type: 'move',
                    sourceField: data,
                })
            }
        } catch (err) {
            console.error('Failed to parse drag data:', err)
        }
    }

    const handleKeyEdit = (newKey: string) => {
        if (!newKey.trim() || newKey === path[path.length - 1]) {
            setIsEditing(false)
            return
        }

        const validKey = convertToPythonVariableName(newKey)
        onUpdate(path, { type: 'rename', newKey: validKey })
        setIsEditing(false)
    }

    const getTypeFromValue = (val: any): string => {
        if (typeof val === 'object' && val !== null) {
            if (val.type) return val.type
            return 'object'
        }
        return val
    }

    const type = getTypeFromValue(value)
    const isObject = type === 'object'
    // Check whether this object already has fields.
    const isObjectWithFields =
        isObject && value && typeof value === 'object' && Object.keys(value).length > 0

    const handleTypeChange = (newType: string) => {
        // Prevent switching type if this object already has nested fields.
        if (isObjectWithFields && newType !== 'object') {
            return
        }
        if (newType === 'object') {
            onUpdate(path, { type: 'update', value: {} })
        } else {
            onUpdate(path, { type: 'update', value: newType })
        }
    }

    const handleTypeChangeWrapper = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleTypeChange(e.target.value)
    }

    return (
        <div
            className={`mb-2 ${level > 0 ? `ml-${level * 4}` : ''}`}
            draggable={!readOnly}
            onDragStart={handleDragStart}
        >
            <div
                className={`flex flex-col ${
                    isObject
                        ? 'border-2 border-dashed border-default-300 rounded-lg p-2'
                        : ''
                } ${isDragOver ? 'bg-default-200' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex items-center gap-2">
                    {isEditing && !readOnly ? (
                        <Input
                            autoFocus
                            value={editValue}
                            size="sm"
                            variant="faded"
                            radius="lg"
                            onChange={(e) =>
                                setEditValue(convertToPythonVariableName(e.target.value))
                            }
                            onBlur={() => handleKeyEdit(editValue)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                    setIsEditing(false)
                                    setEditValue(path[path.length - 1])
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
                            className={`mr-2 p-1 border rounded-full bg-default-100 ${
                                !readOnly
                                    ? 'hover:bg-default-200 cursor-pointer'
                                    : ''
                            }`}
                            onClick={() => !readOnly && setIsEditing(true)}
                        >
                            {path[path.length - 1]}
                        </span>
                    )}

                    <Select
                        onChange={handleTypeChangeWrapper}
                        isDisabled={readOnly || isObjectWithFields}
                        value={type}
                        defaultSelectedKeys={[type]}
                        className="max-w-xs"
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

                    {!readOnly && (
                        <Button
                            isIconOnly
                            radius="full"
                            variant="light"
                            onClick={() => onDelete(path)}
                            color="primary"
                        >
                            <Icon icon="solar:trash-bin-trash-linear" width={22} />
                        </Button>
                    )}
                </div>

                {isObject && typeof value === 'object' && (
                    <div className="ml-4 mt-2">
                        {Object.entries(value).map(([key, val]) => (
                            <SchemaField
                                key={key}
                                path={[...path, key]}
                                value={val}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                readOnly={readOnly}
                                availableFields={availableFields}
                                level={level + 1}
                            />
                        ))}
                        {!readOnly && (
                            <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                onClick={() =>
                                    onUpdate([...path, 'new_field'], {
                                        type: 'add',
                                        value: 'string',
                                    })
                                }
                                className="mt-2"
                            >
                                <Icon
                                    icon="solar:add-circle-linear"
                                    className="mr-1"
                                    width={18}
                                />
                                Add Field
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
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
    const dispatch = useDispatch()

    const getPlaceholderExample = (): string => {
        return schemaType === 'input_schema' ? 'eg. article' : 'eg. summary'
    }

    const handleAddKey = (): void => {
        const validKey = convertToPythonVariableName(newKey)
        if (validKey && !jsonValue?.hasOwnProperty(validKey)) {
            const updatedJson = {
                ...jsonValue,
                [validKey]: newType === 'object' ? {} : newType,
            }
            onChange(updatedJson)
            setNewKey('')
            setNewType(availableFields[0])
        }
    }

    const handleFieldUpdate = (path: string[], action: { type: string; value?: any; newKey?: string; sourceField?: any }): void => {
        const newValue = { ...jsonValue }
        let current = newValue
        const lastIndex = path.length - 1

        if (action.type === 'move') {
            const sourceField = action.sourceField
            const sourcePath = sourceField.path
            const sourceValue = sourceField.value
            const sourceFieldName = sourceField.fieldName

            // Remove from original location
            let sourceParent = newValue
            for (let i = 0; i < sourcePath.length - 1; i++) {
                sourceParent = sourceParent[sourcePath[i]] = { ...sourceParent[sourcePath[i]] }
            }
            delete sourceParent[sourceFieldName]

            // Add to new location (target object's contents)
            let targetParent = newValue
            for (let i = 0; i < path.length - 1; i++) {
                if (typeof targetParent[path[i]] === 'string') {
                    // If it's a string type, initialize it as an empty object
                    targetParent[path[i]] = {}
                }
                targetParent = targetParent[path[i]] = { ...targetParent[path[i]] }
            }

            // Handle the last path segment
            const lastKey = path[path.length - 1]
            if (typeof targetParent[lastKey] === 'string') {
                // If the target is a string type, initialize it as an empty object
                targetParent[lastKey] = {}
            } else if (!targetParent[lastKey] || typeof targetParent[lastKey] !== 'object') {
                // If the target doesn't exist or isn't an object, initialize it
                targetParent[lastKey] = {}
            }
            // Create a new object reference to ensure it's extensible
            targetParent[lastKey] = { ...targetParent[lastKey] }
            targetParent = targetParent[lastKey]

            // Now targetParent is the object we want to add the field to
            targetParent[sourceFieldName] = sourceValue

            // Update edges if needed
            if (schemaType !== 'input_map' && schemaType !== 'output_map') {
                dispatch(
                    updateEdgesOnHandleRename({
                        nodeId,
                        oldHandleId: sourceFieldName,
                        newHandleId: [...path, sourceFieldName].join('.'),
                        schemaType,
                    })
                )
            }
        } else if (action.type === 'rename') {
            let parentObj = newValue
            for (let i = 0; i < lastIndex; i++) {
                parentObj = parentObj[path[i]] = { ...parentObj[path[i]] }
            }
            const oldKey = path[lastIndex]
            const newKey = action.newKey!

            if (oldKey !== newKey) {
                const value = parentObj[oldKey]
                delete parentObj[oldKey]
                parentObj[newKey] = value

                if (schemaType !== 'input_map' && schemaType !== 'output_map') {
                    dispatch(
                        updateEdgesOnHandleRename({
                            nodeId,
                            oldHandleId: oldKey,
                            newHandleId: newKey,
                            schemaType,
                        })
                    )
                }
            }
        } else if (action.type === 'add') {
            // For add operations, create new objects along the path
            for (let i = 0; i < lastIndex; i++) {
                current = current[path[i]] = { ...current[path[i]] }
            }

            // Generate a unique field name
            let newFieldName = 'new_field'
            let counter = 1
            while (current[path[lastIndex]] && current[path[lastIndex]][newFieldName]) {
                newFieldName = `new_field_${counter}`
                counter++
            }

            // If the target is a string (type), convert it to an object
            if (typeof current[path[lastIndex]] === 'string') {
                current[path[lastIndex]] = {}
            }

            // Initialize the object if it doesn't exist
            if (!current[path[lastIndex]]) {
                current[path[lastIndex]] = {}
            }

            // Add the new field
            current[path[lastIndex]][newFieldName] = action.value || 'string'
        } else if (action.type === 'update') {
            // For update operations, create new objects along the path
            for (let i = 0; i < lastIndex; i++) {
                current = current[path[i]] = { ...current[path[i]] }
            }
            current[path[lastIndex]] = action.value
        }

        onChange(newValue)
    }

    const handleFieldDelete = (path: string[]): void => {
        const newValue = { ...jsonValue }
        let current = newValue
        const lastIndex = path.length - 1

        // Create new references for each level to ensure proper mutation
        for (let i = 0; i < lastIndex; i++) {
            current[path[i]] = { ...current[path[i]] }
            current = current[path[i]]
        }

        const key = path[lastIndex]
        delete current[key]

        onChange(newValue)
        dispatch(deleteEdgeByHandle({ nodeId, handleKey: key }))
    }

    return (
        <div
            className={`schema-editor ${readOnly ? 'opacity-75 cursor-not-allowed' : ''}`}
            onDragOver={(e) => {
                if (!readOnly) {
                    e.preventDefault()
                    e.currentTarget.classList.add('bg-default-200')
                }
            }}
            onDragLeave={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('bg-default-200')
            }}
            onDrop={(e) => {
                if (readOnly) return
                e.preventDefault()
                e.currentTarget.classList.remove('bg-default-200')

                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                    const { path, value, fieldName } = data

                    // Create a new value and add the field at root level
                    const newValue = { ...jsonValue }
                    newValue[fieldName] = value

                    // Delete from original location
                    let current = newValue
                    const lastIndex = path.length - 1

                    // Create new references for each level to ensure proper mutation
                    for (let i = 0; i < lastIndex; i++) {
                        current[path[i]] = { ...current[path[i]] }
                        current = current[path[i]]
                    }

                    const key = path[lastIndex]
                    delete current[key]

                    onChange(newValue)

                    if (schemaType !== 'input_map' && schemaType !== 'output_map') {
                        dispatch(
                            updateEdgesOnHandleRename({
                                nodeId,
                                oldHandleId: path.join('.'),
                                newHandleId: fieldName,
                                schemaType,
                            })
                        )
                    }
                } catch (err) {
                    console.error('Failed to handle drop:', err)
                    console.error('Drop event data:', e.dataTransfer.getData('text/plain'))
                }
            }}
        >
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
                        label="Type"
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
                    <SchemaField
                        key={key}
                        path={[key]}
                        value={value}
                        onUpdate={handleFieldUpdate}
                        onDelete={handleFieldDelete}
                        readOnly={readOnly}
                        availableFields={availableFields}
                        level={0}
                    />
                ))}
        </div>
    )
}

export default SchemaEditor
