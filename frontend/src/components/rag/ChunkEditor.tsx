import React, { useState, useEffect } from 'react'
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Input,
    Divider,
    Chip,
    Tooltip,
    Tabs,
    Tab,
    Textarea,
    Spinner,
    Select,
    SelectItem,
} from '@nextui-org/react'
import { Icon } from '@iconify/react'
import TextEditor from '../textEditor/TextEditor'
import { previewChunk } from '@/utils/api'
import type { ChunkPreviewResponse, ChunkPreview } from '@/utils/api'

interface ChunkTemplate {
    enabled: boolean
    template: string
    metadata_template: { type: string } | Record<string, string>
}

interface ChunkEditorProps {
    template: ChunkTemplate
    onTemplateChange: (template: ChunkTemplate) => void
    chunkingConfig: {
        chunk_token_size: number
        min_chunk_size_chars: number
        min_chunk_length_to_embed: number
    }
    files?: File[]
}

export const ChunkEditor: React.FC<ChunkEditorProps> = ({ template, onTemplateChange, chunkingConfig, files }) => {
    const [selectedTab, setSelectedTab] = useState('template')
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)
    const [previewResult, setPreviewResult] = useState<ChunkPreviewResponse | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [metadataFields, setMetadataFields] = useState<Array<{ key: string; value: string }>>(() =>
        Object.entries(template.metadata_template || {}).map(([key, value]) => ({ key, value }))
    )

    // Reset selected file when files prop changes
    useEffect(() => {
        if (files?.length) {
            setSelectedFile(files[0])
        } else {
            setSelectedFile(null)
        }
    }, [files])

    // Update parent when template changes
    useEffect(() => {
        const metadata_template = metadataFields.reduce(
            (acc, field) => {
                if (field.key.trim()) {
                    acc[field.key.trim()] = field.value
                }
                return acc
            },
            {} as Record<string, string>
        )

        onTemplateChange({
            ...template,
            metadata_template,
        })
    }, [metadataFields, template.template])

    const handlePreview = async () => {
        try {
            setIsPreviewLoading(true)

            if (!selectedFile) {
                throw new Error('No file selected for preview')
            }

            const result = await previewChunk(selectedFile, {
                ...chunkingConfig,
                template
            })
            setPreviewResult(result)
        } catch (error) {
            console.error('Error getting preview:', error)
        } finally {
            setIsPreviewLoading(false)
        }
    }

    const handleAddMetadataField = () => {
        setMetadataFields([...metadataFields, { key: '', value: '' }])
    }

    const handleRemoveMetadataField = (index: number) => {
        setMetadataFields(metadataFields.filter((_, i) => i !== index))
    }

    const handleMetadataFieldChange = (index: number, field: 'key' | 'value', value: string) => {
        const newFields = [...metadataFields]
        newFields[index][field] = value
        setMetadataFields(newFields)
    }

    const renderTemplateTab = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-medium font-semibold">Chunk Template</h3>
                <Tooltip content="Use {{ text }} to reference the chunk text. You can add HTML formatting and additional text.">
                    <Icon icon="solar:info-circle-linear" className="text-default-400" />
                </Tooltip>
            </div>
            <TextEditor
                nodeID="chunk-template"
                fieldName="template"
                content={template.template}
                setContent={(content) => onTemplateChange({ ...template, template: content })}
                inputSchema={['text']}
            />

            <Divider />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-medium font-semibold">Preview</h3>
                        <Tooltip content="See how your template will be applied to chunks">
                            <Icon icon="solar:info-circle-linear" className="text-default-400" />
                        </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                        {files && files.length > 0 && (
                            <Select
                                size="sm"
                                value={selectedFile?.name}
                                onChange={(e) => {
                                    const file = files.find(f => f.name === e.target.value)
                                    if (file) setSelectedFile(file)
                                }}
                            >
                                {files.map((file) => (
                                    <SelectItem key={file.name} value={file.name}>
                                        {file.name}
                                    </SelectItem>
                                ))}
                            </Select>
                        )}
                        <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            startContent={<Icon icon="solar:play-circle-linear" />}
                            onPress={handlePreview}
                            isLoading={isPreviewLoading}
                            isDisabled={isPreviewLoading || !selectedFile}
                        >
                            Generate Preview
                        </Button>
                    </div>
                </div>

                {previewResult && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-small font-semibold">Preview Chunks</h4>
                            <Chip size="sm" variant="flat">
                                {previewResult.total_chunks} chunks total
                            </Chip>
                        </div>

                        {previewResult.chunks.map((chunk, index) => (
                            <Card key={index} className="bg-content2">
                                <CardBody className="gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-small font-semibold">
                                                Chunk {chunk.chunk_index}
                                                {chunk.chunk_index === 1 && " (Start)"}
                                                {chunk.chunk_index === previewResult.total_chunks && " (End)"}
                                                {chunk.chunk_index !== 1 && chunk.chunk_index !== previewResult.total_chunks && " (Middle)"}
                                            </h4>
                                        </div>
                                        <p className="text-small text-default-500 mt-2">
                                            {chunk.original_text}
                                        </p>
                                    </div>

                                    <Divider />

                                    <div>
                                        <h4 className="text-small font-semibold">Processed Result</h4>
                                        <div
                                            className="prose dark:prose-invert max-w-none mt-2"
                                            dangerouslySetInnerHTML={{
                                                __html: chunk.processed_text,
                                            }}
                                        />
                                    </div>

                                    <Divider />

                                    <div>
                                        <h4 className="text-small font-semibold">Metadata</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {Object.entries(chunk.metadata).map(([key, value]) => (
                                                <Chip key={key} size="sm" variant="flat">
                                                    {key}: {value}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}

                {!previewResult && !isPreviewLoading && (
                    <Card className="bg-default-50">
                        <CardBody className="py-8">
                            <div className="flex flex-col items-center gap-2 text-default-500">
                                <Icon icon="solar:document-text-linear" width={32} />
                                <p>No preview generated yet</p>
                                <p className="text-small text-center">
                                    Click "Generate Preview" to see how your template will be applied to chunks
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>
    )

    const renderMetadataTab = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-medium font-semibold">Metadata Fields</h3>
                    <Tooltip content="Add metadata fields to be extracted for each chunk. Use {{ text }} to reference the chunk text.">
                        <Icon icon="solar:info-circle-linear" className="text-default-400" />
                    </Tooltip>
                </div>
                <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    startContent={<Icon icon="solar:add-circle-linear" />}
                    onPress={handleAddMetadataField}
                >
                    Add Field
                </Button>
            </div>
            <div className="space-y-4">
                {metadataFields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-start">
                        <Input
                            size="sm"
                            placeholder="Field name"
                            value={field.key}
                            onChange={(e) => handleMetadataFieldChange(index, 'key', e.target.value)}
                            className="flex-1"
                        />
                        <TextEditor
                            nodeID={`metadata-${index}`}
                            fieldName={`metadata-${field.key}`}
                            content={field.value}
                            setContent={(content) => handleMetadataFieldChange(index, 'value', content)}
                            inputSchema={['text']}
                        />
                        <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="light"
                            onPress={() => handleRemoveMetadataField(index)}
                        >
                            <Icon icon="solar:trash-bin-trash-linear" />
                        </Button>
                    </div>
                ))}
                {metadataFields.length === 0 && (
                    <Card className="bg-default-50">
                        <CardBody className="py-8">
                            <div className="flex flex-col items-center gap-2 text-default-500">
                                <Icon icon="solar:document-text-linear" width={32} />
                                <p>No metadata fields added yet</p>
                                <Button
                                    size="sm"
                                    color="primary"
                                    variant="flat"
                                    startContent={<Icon icon="solar:add-circle-linear" />}
                                    onPress={handleAddMetadataField}
                                >
                                    Add Your First Field
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>
    )

    return (
        <Card className="w-full">
            <CardHeader className="flex justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-medium font-semibold">Chunk Template Editor</h3>
                    <Tooltip content="Configure how your chunks will be formatted and what metadata to extract">
                        <Icon icon="solar:info-circle-linear" className="text-default-400" />
                    </Tooltip>
                </div>
            </CardHeader>
            <Divider />
            <CardBody>
                <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key.toString())}>
                    <Tab
                        key="template"
                        title={
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:documents-minimalistic-linear" />
                                <span>Template</span>
                            </div>
                        }
                    >
                        {renderTemplateTab()}
                    </Tab>
                    <Tab
                        key="metadata"
                        title={
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:tag-horizontal-linear" />
                                <span>Metadata</span>
                            </div>
                        }
                    >
                        {renderMetadataTab()}
                    </Tab>
                </Tabs>
            </CardBody>
        </Card>
    )
}

export default ChunkEditor