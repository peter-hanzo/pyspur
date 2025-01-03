import React, { useState, useCallback } from 'react'
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Divider,
  RadioGroup,
  Radio,
  Progress,
  Tooltip,
  Chip,
  Slider,
} from '@nextui-org/react'
import { useRouter } from 'next/router'
import { Info, CheckCircle, ArrowLeft, ArrowRight, Upload, File } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { createKnowledgeBase, KnowledgeBaseCreateRequest } from '@/utils/api'

interface Step {
  title: string
  description: string
  isCompleted: boolean
}

const FileUploadBox = ({ onFilesChange }: { onFilesChange: (files: File[]) => void }) => {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md', '.mdx'],
      'application/pdf': ['.pdf'],
      'text/html': ['.html'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'application/xml': ['.xml'],
      'application/epub+zip': ['.epub'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxSize: 15 * 1024 * 1024, // 15MB
  });

  const removeFile = (name: string) => {
    const updatedFiles = files.filter(file => file.name !== name);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-1 border-dashed rounded-xl p-8
          transition-all duration-300 ease-in-out
          flex flex-col items-center justify-center gap-4
          cursor-pointer
          min-h-[200px]
          ${isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-default-200 dark:border-default-100 hover:border-primary hover:bg-default-100 dark:hover:bg-default-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className={`
          rounded-full p-4
          ${isDragActive ? 'bg-primary/10' : 'bg-default-100 dark:bg-default-50'}
        `}>
          <Upload
            className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-default-500'}`}
          />
        </div>
        <div className="text-center">
          <p className="text-default-900 font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-default-400 mt-1">
            or click to browse
          </p>
        </div>
        <div className="text-xs text-default-400 text-center max-w-sm">
          Supports TXT, MARKDOWN, MDX, PDF, HTML, XLSX, XLS, DOCX, CSV, EML, MSG, PPTX, XML, EPUB, PPT, MD, HTM. Max 15MB each.
        </div>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div className="text-sm font-medium text-default-700">
              Selected Files ({files.length})
            </div>
            <div className="space-y-2">
              {files.map((file) => (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-default-50 border border-default-200"
                >
                  <div className="flex items-center gap-3">
                    <File className="w-4 h-4 text-default-500" />
                    <div>
                      <div className="text-sm font-medium text-default-700">{file.name}</div>
                      <div className="text-xs text-default-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    color="danger"
                    variant="light"
                    onPress={() => removeFile(file.name)}
                  >
                    Remove
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const KnowledgeBaseWizard: React.FC = () => {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // Add random name generator function
  const generateRandomName = () => {
    const adjectives = ['Smart', 'Brilliant', 'Dynamic', 'Quantum', 'Neural', 'Cosmic', 'Intelligent', 'Advanced', 'Strategic', 'Innovative'];
    const nouns = ['Atlas', 'Nexus', 'Matrix', 'Archive', 'Library', 'Vault', 'Repository', 'Database', 'Collection', 'Hub'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataSource: 'upload',
    syncTool: '',
    chunkSize: '1000',
    overlap: '200',
    parsingStrategy: 'auto',
    embeddingModel: 'openai',
    vectorDb: 'pinecone',
    searchStrategy: 'vector',
    semanticWeight: '0.7',
    keywordWeight: '0.3',
    topK: '2',
    scoreThreshold: '0.7',
    chunkingMode: 'automatic',
  })

  const [steps, setSteps] = useState<Step[]>([
    {
      title: 'Data Source',
      description: 'Choose how to input your data',
      isCompleted: Boolean(formData.name) && (formData.dataSource === 'sync' ? Boolean(formData.syncTool) : uploadedFiles.length > 0),
    },
    {
      title: 'Text Processing',
      description: 'Configure document parsing and chunking',
      isCompleted: Boolean(formData.parsingStrategy && formData.chunkSize),
    },
    {
      title: 'Embedding & Retrieval',
      description: 'Set up embedding and search configuration',
      isCompleted: Boolean(formData.embeddingModel && formData.vectorDb && formData.searchStrategy),
    },
    {
      title: 'Execution',
      description: 'Review and create your knowledge base',
      isCompleted: false,
    },
  ]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleWeightChange = (value: number) => {
    const semanticWeight = value / 100
    const keywordWeight = (100 - value) / 100
    setFormData(prev => ({
      ...prev,
      semanticWeight: semanticWeight.toFixed(1),
      keywordWeight: keywordWeight.toFixed(1)
    }))
  }

  const handleChunkSizeChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      chunkSize: value.toString()
    }))
  }

  const handleOverlapChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      overlap: value.toString()
    }))
  }

  const parsingStrategies = [
    {
      key: "auto",
      label: "Automatic Detection",
      description: "Automatically detect file type and apply appropriate parser"
    },
    {
      key: "markdown",
      label: "Markdown",
      description: "Parse Markdown files with proper heading structure"
    },
    {
      key: "pdf",
      label: "PDF",
      description: "Extract text and maintain document structure"
    },
    {
      key: "html",
      label: "HTML",
      description: "Process HTML content with semantic structure"
    }
  ];

  const handleFilesChange = (newFiles: File[]) => {
    setUploadedFiles(newFiles);
    // Update step completion status based on files
    setSteps(prevSteps => prevSteps.map((step, idx) =>
      idx === 0 ? { ...step, isCompleted: newFiles.length > 0 } : step
    ));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      label="Knowledge Base Name"
                      placeholder="Enter a name for your knowledge base"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full"
                      isRequired
                    />
                    <Button
                      isIconOnly
                      variant="flat"
                      className="self-end h-14"
                      onPress={() => handleInputChange('name', generateRandomName())}
                    >
                      🎲
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Textarea
                    label="Description"
                    placeholder="Enter a description for your knowledge base"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Select Data Source</span>
                  <Tooltip content="Choose how you want to input your documents into the knowledge base">
                    <Info className="w-4 h-4 text-default-400" />
                  </Tooltip>
                </div>
                <RadioGroup
                  value={formData.dataSource}
                  onValueChange={(value) => handleInputChange('dataSource', value)}
                  classNames={{
                    wrapper: "gap-4",
                  }}
                >
                  <Radio
                    value="upload"
                    description="Upload files directly from your computer"
                    classNames={{
                      base: "border border-default-200 rounded-lg p-4 hover:bg-default-100",
                    }}
                  >
                    File Upload
                  </Radio>
                  <Radio
                    value="sync"
                    description="Sync content from your existing tools"
                    classNames={{
                      base: "border border-default-200 rounded-lg p-4 hover:bg-default-100",
                    }}
                  >
                    Sync with Existing Tools
                  </Radio>
                </RadioGroup>
              </div>

              {formData.dataSource === 'upload' && (
                <div className="pl-4 border-l-2 border-primary/20">
                  <FileUploadBox onFilesChange={handleFilesChange} />
                </div>
              )}

              {formData.dataSource === 'sync' && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Select
                    label="Select Tool"
                    placeholder="Choose a tool to sync with"
                    value={formData.syncTool}
                    onChange={(e) => handleInputChange('syncTool', e.target.value)}
                    classNames={{
                      trigger: "h-12",
                    }}
                  >
                    <SelectItem key="notion" value="notion" startContent={<img src="/icons/notion.svg" className="w-4 h-4" />}>
                      Notion
                    </SelectItem>
                    <SelectItem key="confluence" value="confluence" startContent={<img src="/icons/confluence.svg" className="w-4 h-4" />}>
                      Confluence
                    </SelectItem>
                    <SelectItem key="github" value="github" startContent={<img src="/icons/github.svg" className="w-4 h-4" />}>
                      GitHub
                    </SelectItem>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )
      case 1:
        return (
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Parsing Configuration</span>
                <Tooltip content="Configure how your documents will be processed and split into chunks">
                  <Info className="w-4 h-4 text-default-400" />
                </Tooltip>
              </div>
              <Select
                label="Parsing Strategy"
                placeholder="Select parsing strategy"
                selectedKeys={[formData.parsingStrategy]}
                onSelectionChange={(keys) => handleInputChange('parsingStrategy', Array.from(keys)[0].toString())}
                items={parsingStrategies}
                classNames={{
                  trigger: "h-12",
                }}
              >
                {(strategy) => (
                  <SelectItem key={strategy.key} textValue={strategy.label}>
                    <div className="flex flex-col">
                      <span>{strategy.label}</span>
                      <span className="text-tiny text-default-400">{strategy.description}</span>
                    </div>
                  </SelectItem>
                )}
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Chunking Mode</span>
                <Tooltip content="Choose between automatic or manual configuration of chunk size and overlap">
                  <Info className="w-4 h-4 text-default-400" />
                </Tooltip>
              </div>
              <RadioGroup
                value={formData.chunkingMode}
                onValueChange={(value) => handleInputChange('chunkingMode', value)}
                orientation="horizontal"
                classNames={{
                  wrapper: "gap-4",
                }}
              >
                <Radio
                  value="automatic"
                  description="Let the system determine optimal chunk size and overlap"
                >
                  Automatic
                </Radio>
                <Radio
                  value="manual"
                  description="Manually configure chunk size and overlap"
                >
                  Manual
                </Radio>
              </RadioGroup>
            </div>

            {formData.chunkingMode === 'manual' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Chunk Size</span>
                      <Tooltip content="Number of tokens per chunk. Larger chunks provide more context but may be less precise">
                        <Info className="w-4 h-4 text-default-400" />
                      </Tooltip>
                    </div>
                    <span className="text-sm text-default-500">{formData.chunkSize} tokens</span>
                  </div>
                  <div className="px-3">
                    <Slider
                      size="sm"
                      step={10}
                      minValue={100}
                      maxValue={2000}
                      value={Number(formData.chunkSize)}
                      onChange={handleChunkSizeChange}
                      classNames={{
                        base: "max-w-full",
                        track: "bg-default-500/30",
                        filler: "bg-primary",
                        thumb: "transition-all shadow-lg",
                      }}
                      marks={[
                        {
                          value: 500,
                          label: "500",
                        },
                        {
                          value: 1000,
                          label: "1000",
                        },
                        {
                          value: 1500,
                          label: "1500",
                        },
                      ]}
                      aria-label="Chunk Size"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Chunk Overlap</span>
                      <Tooltip content="Number of overlapping tokens between chunks to maintain context">
                        <Info className="w-4 h-4 text-default-400" />
                      </Tooltip>
                    </div>
                    <span className="text-sm text-default-500">{formData.overlap} tokens</span>
                  </div>
                  <div className="px-3">
                    <Slider
                      size="sm"
                      step={10}
                      minValue={0}
                      maxValue={500}
                      value={Number(formData.overlap)}
                      onChange={handleOverlapChange}
                      classNames={{
                        base: "max-w-full",
                        track: "bg-default-500/30",
                        filler: "bg-primary",
                        thumb: "transition-all shadow-lg",
                      }}
                      marks={[
                        {
                          value: 100,
                          label: "100",
                        },
                        {
                          value: 200,
                          label: "200",
                        },
                        {
                          value: 300,
                          label: "300",
                        },
                      ]}
                      aria-label="Chunk Overlap"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      case 2:
        return (
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Embedding Configuration</span>
                <Tooltip content="Configure how your text will be converted to vector embeddings">
                  <Info className="w-4 h-4 text-default-400" />
                </Tooltip>
              </div>
              <Select
                label="Embedding Model"
                placeholder="Select embedding model"
                value={formData.embeddingModel}
                onChange={(e) => handleInputChange('embeddingModel', e.target.value)}
                classNames={{
                  trigger: "h-12",
                }}
              >
                <SelectItem key="openai" value="openai">
                  <div className="flex flex-col">
                    <span>OpenAI Ada</span>
                    <span className="text-tiny text-default-400">Best overall performance, hosted solution</span>
                  </div>
                </SelectItem>
                <SelectItem key="cohere" value="cohere">
                  <div className="flex flex-col">
                    <span>Cohere</span>
                    <span className="text-tiny text-default-400">Good multilingual support</span>
                  </div>
                </SelectItem>
                <SelectItem key="local" value="local">
                  <div className="flex flex-col">
                    <span>Local Model</span>
                    <span className="text-tiny text-default-400">Run entirely on your infrastructure</span>
                  </div>
                </SelectItem>
              </Select>

              <Select
                label="Vector Database"
                placeholder="Select vector database"
                value={formData.vectorDb}
                onChange={(e) => handleInputChange('vectorDb', e.target.value)}
                classNames={{
                  trigger: "h-12",
                }}
              >
                <SelectItem key="pinecone" value="pinecone">
                  <div className="flex flex-col">
                    <span>Pinecone</span>
                    <span className="text-tiny text-default-400">Production-ready, scalable vector database</span>
                  </div>
                </SelectItem>
                <SelectItem key="qdrant" value="qdrant">
                  <div className="flex flex-col">
                    <span>Qdrant</span>
                    <span className="text-tiny text-default-400">Open-source, high-performance</span>
                  </div>
                </SelectItem>
                <SelectItem key="weaviate" value="weaviate">
                  <div className="flex flex-col">
                    <span>Weaviate</span>
                    <span className="text-tiny text-default-400">Multi-modal vector search</span>
                  </div>
                </SelectItem>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Search Strategy</span>
                <Tooltip content="Choose how documents will be retrieved from your knowledge base">
                  <Info className="w-4 h-4 text-default-400" />
                </Tooltip>
              </div>
              <RadioGroup
                value={formData.searchStrategy}
                onValueChange={(value) => handleInputChange('searchStrategy', value)}
                classNames={{
                  wrapper: "grid grid-cols-1 gap-4 w-full",
                }}
              >
                <Radio
                  value="vector"
                  description="Semantic search using vector similarity"
                  classNames={{
                    base: "w-full border-2 border-default-200 rounded-lg p-4 hover:bg-default-100 cursor-pointer data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
                    wrapper: "before:border-default-200",
                    labelWrapper: "w-full",
                    label: "w-full font-semibold text-base",
                    description: "w-full text-default-500",
                  }}
                >
                  Vector Search
                </Radio>
                <Radio
                  value="fulltext"
                  description="Traditional keyword-based search"
                  classNames={{
                    base: "w-full border-2 border-default-200 rounded-lg p-4 hover:bg-default-100 cursor-pointer data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
                    wrapper: "before:border-default-200",
                    labelWrapper: "w-full",
                    label: "w-full font-semibold text-base",
                    description: "w-full text-default-500",
                  }}
                >
                  Full-text Search
                </Radio>
                <Radio
                  value="hybrid"
                  description="Combine vector and keyword search"
                  classNames={{
                    base: "w-full border-2 border-default-200 rounded-lg p-4 hover:bg-default-100 cursor-pointer data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
                    wrapper: "before:border-default-200",
                    labelWrapper: "w-full",
                    label: "w-full font-semibold text-base",
                    description: "w-full text-default-500",
                  }}
                >
                  Hybrid Search
                </Radio>
              </RadioGroup>

              {formData.searchStrategy === 'hybrid' && (
                <div className="space-y-6 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Weighted Score</span>
                        <Tooltip content="Balance between semantic and keyword search. Higher semantic weight means more emphasis on meaning over exact matches.">
                          <Info className="w-4 h-4 text-default-400" />
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-primary">SEMANTIC {formData.semanticWeight}</span>
                        <span className="text-sm text-default-400">/</span>
                        <span className="text-sm text-success">KEYWORD {formData.keywordWeight}</span>
                      </div>
                    </div>
                    <div className="px-3">
                      <Slider
                        size="sm"
                        step={10}
                        value={Number(formData.semanticWeight) * 100}
                        onChange={handleWeightChange}
                        classNames={{
                          base: "max-w-full",
                          track: "bg-default-500/30",
                          filler: "bg-gradient-to-r from-primary to-success",
                          thumb: "transition-all shadow-lg",
                        }}
                        aria-label="Semantic-Keyword Weight"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Top K</span>
                        <Tooltip content="Maximum number of results to return">
                          <Info className="w-4 h-4 text-default-400" />
                        </Tooltip>
                      </div>
                      <Input
                        type="number"
                        placeholder="Enter Top K value"
                        value={formData.topK || "2"}
                        onChange={(e) => handleInputChange('topK', e.target.value)}
                        min={1}
                        max={100}
                        classNames={{
                          input: "h-12",
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Score Threshold</span>
                        <Tooltip content="Minimum similarity score required for a result to be included">
                          <Info className="w-4 h-4 text-default-400" />
                        </Tooltip>
                      </div>
                      <Input
                        type="number"
                        placeholder="Enter threshold"
                        value={formData.scoreThreshold || "0.7"}
                        onChange={(e) => handleInputChange('scoreThreshold', e.target.value)}
                        min={0}
                        max={1}
                        step={0.1}
                        classNames={{
                          input: "h-12",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 3:
        return (
          <div className="flex flex-col gap-6">
            <Card className="bg-background/60 dark:bg-background/60 backdrop-blur-lg backdrop-saturate-150 shadow-xl border-1 border-default-200">
              <CardBody className="gap-8 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-default-900">{steps[currentStep].title}</h2>
                    <p className="text-small text-default-400">{steps[currentStep].description}</p>
                  </div>
                  <div className="text-default-400 text-sm font-medium">
                    Step {currentStep + 1} of {steps.length}
                  </div>
                </div>

                <Divider className="my-4" />

                <motion.div
                  className="min-h-[300px]"
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>

                <Divider className="my-4" />

                <div className="flex justify-between items-center">
                  <Button
                    color="danger"
                    variant="light"
                    onPress={handleCancel}
                    className="font-medium hover:bg-danger/10"
                  >
                    Cancel
                  </Button>
                  <div className="flex gap-3">
                    {currentStep > 0 && (
                      <Button
                        variant="bordered"
                        onPress={handleBack}
                        className="font-medium"
                        startContent={<ArrowLeft size={18} />}
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      color="primary"
                      onPress={handleNext}
                      className="font-medium"
                      endContent={currentStep !== steps.length - 1 && <ArrowRight size={18} />}
                    >
                      {currentStep === steps.length - 1 ? 'Create' : 'Next'}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )
      default:
        return null
    }
  }

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      try {
        // Prepare the request data
        const requestData: KnowledgeBaseCreateRequest = {
          name: formData.name || 'New Knowledge Base',
          description: formData.description,
          data_source: {
            type: formData.dataSource as 'upload' | 'sync',
            tool: formData.dataSource === 'sync' ? formData.syncTool : undefined,
            files: formData.dataSource === 'upload' ? uploadedFiles : undefined,
          },
          text_processing: {
            parsing_strategy: formData.parsingStrategy,
            chunk_size: Number(formData.chunkSize),
            overlap: Number(formData.overlap),
          },
          embedding: {
            model: formData.embeddingModel,
            vector_db: formData.vectorDb,
            search_strategy: formData.searchStrategy,
            semantic_weight: formData.searchStrategy === 'hybrid' ? Number(formData.semanticWeight) : undefined,
            keyword_weight: formData.searchStrategy === 'hybrid' ? Number(formData.keywordWeight) : undefined,
            top_k: formData.searchStrategy === 'hybrid' ? Number(formData.topK) : undefined,
            score_threshold: formData.searchStrategy === 'hybrid' ? Number(formData.scoreThreshold) : undefined,
          },
        }

        // Make the API call
        await createKnowledgeBase(requestData)

        // Redirect to the RAG page after successful creation
        router.push('/rag')
      } catch (error) {
        console.error('Error creating knowledge base:', error)
        // You might want to show an error message to the user here
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All progress will be lost.')) {
      router.push('/rag')
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6 min-h-screen bg-gradient-to-b from-background to-default-50/50">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left side - Steps */}
        <div className="w-full md:w-1/3 lg:w-1/4">
          <motion.div
            className="sticky top-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col max-w-fit mb-2">
              <h1 className="text-3xl font-bold text-default-900">Create Knowledge Base</h1>
              <p className="text-small text-default-400">Follow the steps to configure your knowledge base settings.</p>
            </div>
            <Progress
              classNames={{
                base: "mb-8",
                track: "drop-shadow-md",
                indicator: "bg-gradient-to-r from-primary to-primary-500",
                label: "text-sm font-medium",
                value: "text-sm font-medium text-default-500",
              }}
              label="Progress"
              size="md"
              value={(currentStep / (steps.length - 1)) * 100}
              showValueLabel={true}
              valueLabel={`${currentStep + 1} of ${steps.length}`}
            />
            <div className="flex flex-col gap-4">
              {steps.map((step, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col gap-1 rounded-xl border-1 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                    ${currentStep === index
                      ? 'border-primary bg-primary/5 shadow-md'
                      : step.isCompleted
                        ? 'border-success/50 bg-success/5'
                        : 'border-default-200 dark:border-default-100'
                    }`}
                  disabled={!step.isCompleted && index > currentStep}
                  whileHover={{ scale: !(!step.isCompleted && index > currentStep) ? 1.02 : 1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors duration-300
                        ${currentStep === index
                          ? 'bg-primary text-white shadow-md'
                          : step.isCompleted
                            ? 'bg-success text-white'
                            : 'bg-default-100 text-default-600'
                        }`}
                    >
                      {step.isCompleted ? '✓' : index + 1}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-default-900">{step.title}</span>
                      <span className="text-xs text-default-400">{step.description}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right side - Content */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-background/60 dark:bg-background/60 backdrop-blur-lg backdrop-saturate-150 shadow-xl border-1 border-default-200">
            <CardBody className="gap-8 p-8">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-default-900">{steps[currentStep].title}</h2>
                  <p className="text-small text-default-400">{steps[currentStep].description}</p>
                </div>
                <div className="text-default-400 text-sm font-medium">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>

              <Divider className="my-4" />

              <motion.div
                className="min-h-[300px]"
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>

              <Divider className="my-4" />

              <div className="flex justify-between items-center">
                <Button
                  color="danger"
                  variant="light"
                  onPress={handleCancel}
                  className="font-medium hover:bg-danger/10"
                >
                  Cancel
                </Button>
                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <Button
                      variant="bordered"
                      onPress={handleBack}
                      className="font-medium"
                      startContent={<ArrowLeft size={18} />}
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    color="primary"
                    onPress={handleNext}
                    className="font-medium"
                    endContent={currentStep !== steps.length - 1 && <ArrowRight size={18} />}
                  >
                    {currentStep === steps.length - 1 ? 'Create' : 'Next'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default KnowledgeBaseWizard