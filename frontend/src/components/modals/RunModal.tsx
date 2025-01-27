import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Input,
    Tooltip,
    Switch,
} from '@heroui/react'
import { Icon } from '@iconify/react'
import TextEditor from '../textEditor/TextEditor'
import { addTestInput, deleteTestInput } from '../../store/flowSlice'
import { RootState } from '../../store/store'
import { AppDispatch } from '../../store/store'
import { TestInput } from '@/types/api_types/workflowSchemas'
import { useSaveWorkflow } from '../../hooks/useSaveWorkflow'
import FileUploadBox from '../FileUploadBox'
import { uploadTestFiles } from '@/utils/api'

interface RunModalProps {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    onRun: (initialInputs: Record<string, any>, files?: Record<string, string[]>) => void
    onSave?: () => void
}

interface EditingCell {
    rowId: number
    field: string
}

const RunModal: React.FC<RunModalProps> = ({ isOpen, onOpenChange, onRun, onSave }) => {
    const nodes = useSelector((state: RootState) => state.flow.nodes)
    const nodeConfigs = useSelector((state: RootState) => state.flow.nodeConfigs)
    const workflowID = useSelector((state: RootState) => state.flow.workflowID)
    const inputNode = nodes.find((node) => node.type === 'InputNode')
    const workflowInputVariables = inputNode ? nodeConfigs[inputNode.id]?.output_schema || {} : {}
    const workflowInputVariableNames = Object.keys(workflowInputVariables)

    const [testData, setTestData] = useState<TestInput[]>([])
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
    const [selectedRow, setSelectedRow] = useState<string | null>(null)
    const [editorContents, setEditorContents] = useState<Record<string, string>>({})
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})
    const [filePaths, setFilePaths] = useState<Record<string, string[]>>({})
    const [fileInputModes, setFileInputModes] = useState<Record<string, 'file' | 'url'>>({})

    const dispatch = useDispatch<AppDispatch>()
    const testInputs = useSelector((state: RootState) => state.flow.testInputs)
    const saveWorkflow = useSaveWorkflow()

    useEffect(() => {
        setTestData(testInputs)
    }, [testInputs])

    useEffect(() => {
        if (isOpen && testData.length > 0 && !selectedRow) {
            setSelectedRow(testData[0].id.toString())
        }
    }, [isOpen, testData, selectedRow])

    const handleAddRow = () => {
        // Check if we have any content to add
        const hasContent = Object.values(editorContents).some((v) => v?.trim())
        if (!hasContent) return

        const newId = Date.now()
        const newTestInput: TestInput = {
            id: newId,
            ...editorContents,
        }
        setTestData([...testData, newTestInput])
        setEditorContents({}) // Clear editor contents
        setSelectedRow(newId.toString()) // Select the newly added row
        dispatch(addTestInput(newTestInput))
        saveWorkflow()
    }

    const handleDeleteRow = (id: number) => {
        setTestData(testData.filter((row) => row.id !== id))
        dispatch(deleteTestInput({ id }))
        saveWorkflow()
    }

    const handleDoubleClick = (rowId: number, field: string) => {
        setEditingCell({ rowId, field })
    }

    const handleCellEdit = (rowId: number, field: string, value: string) => {
        setTestData(testData.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)))
    }

    const handleBlur = () => {
        setEditingCell(null)
    }

    const handleFilesChange = async (nodeId: string, files: File[]) => {
        if (!workflowID) return

        setUploadedFiles((prev) => ({ ...prev, [nodeId]: files }))

        try {
            if (files.length === 0) {
                // If no files, clear the file path from editor contents
                const fileFields = workflowInputVariableNames.filter((field) => field.toLowerCase().includes('file'))
                if (fileFields.length > 0) {
                    const field = fileFields[0]
                    setEditorContents((prev) => ({
                        ...prev,
                        [field]: '',
                    }))
                }
                return
            }

            const paths = await uploadTestFiles(workflowID, nodeId, files)
            setFilePaths((prev) => ({ ...prev, ...paths }))

            // Update the editor contents with the file path
            const fileFields = workflowInputVariableNames.filter((field) => field.toLowerCase().includes('file'))
            if (fileFields.length > 0) {
                const field = fileFields[0]
                setEditorContents((prev) => ({
                    ...prev,
                    [field]: paths[nodeId][0], // Set the first file field to the first uploaded file path
                }))
            }
        } catch (error) {
            console.error('Error handling files:', error)
        }
    }

    const handleUrlInput = (field: string, value: string) => {
        // Basic URL validation
        const isValidUrl = value === '' || /^(https?:\/\/|gs:\/\/)/.test(value)
        if (isValidUrl) {
            setEditorContents((prev) => ({
                ...prev,
                [field]: value,
            }))
        }
    }

    const renderCell = (row: TestInput, field: string) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.field === field
        const content = row[field]

        // Handle file paths
        if (field.toLowerCase().includes('file') && content) {
            const fileName = content.split('/').pop() // Get just the filename from the path
            return (
                <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:file-present" className="text-primary" />
                    <Tooltip content={content} showArrow={true}>
                        <span className="max-w-[200px] truncate">{fileName}</span>
                    </Tooltip>
                </div>
            )
        }

        if (isEditing) {
            return (
                <div onClick={(e) => e.stopPropagation()}>
                    <Input
                        autoFocus
                        size="sm"
                        defaultValue={content}
                        onBlur={(e) => {
                            handleCellEdit(row.id, field, e.target.value)
                            handleBlur()
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleCellEdit(row.id, field, e.currentTarget.value)
                                handleBlur()
                            }
                        }}
                        endContent={
                            <Button isIconOnly size="sm" variant="light" color="success" onPress={handleBlur}>
                                <Icon icon="material-symbols:check" />
                            </Button>
                        }
                    />
                </div>
            )
        }

        return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Tooltip content={content} showArrow={true}>
                    <span className="max-w-[200px] truncate">{content}</span>
                </Tooltip>
                <Button isIconOnly size="sm" variant="light" onPress={() => handleDoubleClick(row.id, field)}>
                    <Icon icon="solar:pen-linear" />
                </Button>
            </div>
        )
    }

    const handleRun = () => {
        if (!selectedRow || !inputNode) return

        const selectedTestCase = testData.find((row) => row.id.toString() === selectedRow)
        if (!selectedTestCase) return

        const { id, ...inputValues } = selectedTestCase

        const initialInputs = {
            [inputNode.id]: inputValues,
        }

        onRun(initialInputs, filePaths)
    }

    const handleSave = () => {
        if (typeof onSave === 'function') {
            onSave()
        }
        onOpenChange(false)
    }

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            classNames={{
                base: 'max-w-[95vw] w-[1400px]',
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Run Test Cases</ModalHeader>
                        <ModalBody>
                            <div className="overflow-x-auto">
                                <Table
                                    aria-label="Test cases table"
                                    selectionMode="single"
                                    disabledKeys={editingCell ? new Set([editingCell.rowId.toString()]) : new Set()}
                                    selectedKeys={selectedRow ? [selectedRow] : new Set()}
                                    onSelectionChange={(selection) => {
                                        const selectedKey = Array.from(selection)[0]?.toString() || null
                                        setSelectedRow(selectedKey)
                                    }}
                                    classNames={{
                                        base: 'min-w-[800px]',
                                        table: 'min-w-full',
                                    }}
                                >
                                    <TableHeader>
                                        {[
                                            <TableColumn key="id">ID</TableColumn>,
                                            ...workflowInputVariableNames.map((field) => (
                                                <TableColumn key={field}>{field}</TableColumn>
                                            )),
                                            <TableColumn key="actions">Actions</TableColumn>,
                                        ]}
                                    </TableHeader>
                                    <TableBody>
                                        {testData.map((row) => (
                                            <TableRow key={row.id}>
                                                {[
                                                    <TableCell key="id">{row.id}</TableCell>,
                                                    ...workflowInputVariableNames.map((field) => (
                                                        <TableCell key={field}>{renderCell(row, field)}</TableCell>
                                                    )),
                                                    <TableCell key="actions">
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            onPress={() => handleDeleteRow(row.id)}
                                                        >
                                                            <Icon icon="solar:trash-bin-trash-linear" />
                                                        </Button>
                                                    </TableCell>,
                                                ]}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex gap-2 overflow-x-auto">
                                {workflowInputVariableNames.map((field) => (
                                    <div key={field} className="w-[300px] min-w-[300px]">
                                        <div className="mb-2 font-medium text-foreground">{field}</div>
                                        {field.toLowerCase().includes('file') ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Switch
                                                        size="sm"
                                                        isSelected={fileInputModes[field] === 'url'}
                                                        onChange={() => {
                                                            setFileInputModes((prev) => ({
                                                                ...prev,
                                                                [field]: prev[field] === 'file' ? 'url' : 'file',
                                                            }))
                                                            // Clear the input when switching modes
                                                            setEditorContents((prev) => ({
                                                                ...prev,
                                                                [field]: '',
                                                            }))
                                                            if (fileInputModes[field] === 'file') {
                                                                handleFilesChange(inputNode.id, [])
                                                            }
                                                        }}
                                                    >
                                                        URL Input
                                                    </Switch>
                                                </div>
                                                {(fileInputModes[field] || 'file') === 'url' ? (
                                                    <Input
                                                        type="url"
                                                        placeholder="Enter URL (https:// or gs://)"
                                                        value={editorContents[field] || ''}
                                                        onChange={(e) => handleUrlInput(field, e.target.value)}
                                                        description="Supports HTTP(S) and Google Storage URLs"
                                                    />
                                                ) : (
                                                    <FileUploadBox
                                                        multiple={false}
                                                        onFilesChange={(files) =>
                                                            handleFilesChange(inputNode.id, files)
                                                        }
                                                        acceptedFileTypes={{
                                                            // Documents
                                                            'application/pdf': ['.pdf'],
                                                            'text/plain': ['.txt'],
                                                            'text/markdown': ['.md'],
                                                            'application/msword': ['.doc'],
                                                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                                                                ['.docx'],
                                                            // Images
                                                            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                                                            // Audio
                                                            'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
                                                            // Video
                                                            'video/*': ['.mp4', '.webm', '.avi', '.mov'],
                                                        }}
                                                        supportedFormatsMessage="Supported formats: Documents (PDF, TXT, MD, DOC, DOCX), Images (PNG, JPG, JPEG, GIF, WEBP), Audio (MP3, WAV, OGG, M4A), and Video files (MP4, WEBM, AVI, MOV)"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <TextEditor
                                                nodeID={`newRow-${field}`}
                                                fieldName={field}
                                                fieldTitle={field}
                                                inputSchema={[]}
                                                content={editorContents[field] || ''}
                                                setContent={(value: string) => {
                                                    setEditorContents((prev) => ({
                                                        ...prev,
                                                        [field]: value,
                                                    }))
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                                <div className="flex-none">
                                    <Button
                                        color="primary"
                                        onPress={handleAddRow}
                                        isDisabled={Object.values(editorContents).every((v) => !v?.trim())}
                                    >
                                        Add Row
                                    </Button>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button color="primary" onPress={handleSave}>
                                Save
                            </Button>
                            <Button
                                color="primary"
                                onPress={() => {
                                    handleRun()
                                    onClose()
                                }}
                                isDisabled={!selectedRow}
                            >
                                Run
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}

export default RunModal
