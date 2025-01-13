import React, { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  SelectSection,
  Divider,
  RadioGroup,
  Radio,
  Progress,
  Tooltip,
  Chip,
  Slider,
  Switch,
  Alert,
  Spinner,
} from '@nextui-org/react'
import { useRouter } from 'next/router'
import { Info, CheckCircle, ArrowLeft, ArrowRight, Upload, File } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { createKnowledgeBase, KnowledgeBaseCreateRequest, getEmbeddingModels, EmbeddingModelConfig, getVectorStores, VectorStoreConfig, listApiKeys, getApiKey, getKnowledgeBaseJobStatus, KnowledgeBaseCreationJob } from '@/utils/api'

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
  const [embeddingModels, setEmbeddingModels] = useState<Record<string, EmbeddingModelConfig>>({})
  const [vectorStores, setVectorStores] = useState<Record<string, VectorStoreConfig>>({})
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [jobStatus, setJobStatus] = useState<KnowledgeBaseCreationJob | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [nameAlert, setNameAlert] = useState<string | null>(null);

  useEffect(() => {
    if (nameAlert) {
      const timer = setTimeout(() => {
        setNameAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [nameAlert]);

  useEffect(() => {
    const loadEmbeddingModels = async () => {
      try {
        const models = await getEmbeddingModels()
        setEmbeddingModels(models)
      } catch (error) {
        console.error('Error loading embedding models:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    const loadVectorStores = async () => {
      try {
        const stores = await getVectorStores()
        setVectorStores(stores)
      } catch (error) {
        console.error('Error loading vector stores:', error)
      } finally {
        setIsLoadingStores(false)
      }
    }

    const loadApiKeys = async () => {
      try {
        const keys = await listApiKeys();
        const keyValues: Record<string, string> = {};
        for (const key of keys) {
          const keyData = await getApiKey(key);
          if (keyData.value) {
            keyValues[key] = keyData.value;
          }
        }
        setApiKeys(keyValues);
      } catch (error) {
        console.error('Error loading API keys:', error);
      }
    };

    loadEmbeddingModels()
    loadVectorStores()
    loadApiKeys()
  }, [])

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const startPollingJobStatus = useCallback((jobId: string) => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start polling every 2 seconds
    const interval = setInterval(async () => {
      try {
        const status = await getKnowledgeBaseJobStatus(jobId);
        setJobStatus(status);

        // Stop polling if the job is completed or failed
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setPollingInterval(null);

          // Redirect to RAG page if completed
          if (status.status === 'completed') {
            router.push('/rag');
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(interval);
        setPollingInterval(null);
      }
    }, 2000);

    setPollingInterval(interval);
  }, [router]);

  // Add random name generator function
  const generateRandomName = () => {
    const adjectives = ['Smart', 'Brilliant', 'Dynamic', 'Quantum', 'Neural', 'Cosmic', 'Intelligent', 'Advanced', 'Strategic', 'Innovative'];
    const nouns = ['Atlas', 'Nexus', 'Matrix', 'Archive', 'Library', 'Vault', 'Repository', 'Database', 'Collection', 'Hub'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const now = new Date();
    const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    return `${randomAdjective} ${randomNoun} - ${timestamp}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataSource: 'upload',
    chunkSize: '1000',
    overlap: '200',
    useVisionModel: false,
    visionModel: 'gpt-4o-mini',
    visionProvider: 'openai',
    embeddingModel: 'openai',
    vectorDb: 'pinecone',
    searchStrategy: 'vector',
    semanticWeight: '0.7',
    keywordWeight: '0.3',
    topK: '2',
    scoreThreshold: '0.7',
    chunkingMode: 'automatic',
    parsingStrategy: 'auto',
  })

  const [steps, setSteps] = useState<Step[]>([
    {
      title: 'Data Source',
      description: 'Name your knowledge base and optionally upload documents',
      isCompleted: false,
    },
    {
      title: 'Configuration',
      description: 'Configure processing and embedding settings',
      isCompleted: false,
    },
    {
      title: 'Execution',
      description: 'Review and create your knowledge base',
      isCompleted: false,
    },
  ]);

  useEffect(() => {
    // Initialize steps completion state
    updateStepsCompletion(formData, uploadedFiles);
  }, []);

  const updateStepsCompletion = (currentFormData: typeof formData, currentFiles: File[]) => {
    setSteps(prevSteps => prevSteps.map((step, idx) => {
      switch (idx) {
        case 0: // Data Source
          return {
            ...step,
            isCompleted: Boolean(currentFormData.name),
          }
        case 1: // Configuration
          return {
            ...step,
            isCompleted: currentStep > 0 && Boolean(currentFormData.chunkSize && currentFormData.embeddingModel && currentFormData.vectorDb && currentFormData.searchStrategy),
          }
        case 2: // Execution
          return {
            ...step,
            isCompleted: false,
          }
        default:
          return step
      }
    }));
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };
    setFormData(newFormData);
    updateStepsCompletion(newFormData, uploadedFiles);
  }

  const handleWeightChange = (value: number) => {
    const semanticWeight = value / 100
    const keywordWeight = (100 - value) / 100
    const newFormData = {
      ...formData,
      semanticWeight: semanticWeight.toFixed(1),
      keywordWeight: keywordWeight.toFixed(1)
    };
    setFormData(newFormData);
    updateStepsCompletion(newFormData, uploadedFiles);
  }

  const handleChunkSizeChange = (value: number) => {
    const newFormData = {
      ...formData,
      chunkSize: value.toString()
    };
    setFormData(newFormData);
    updateStepsCompletion(newFormData, uploadedFiles);
  }

  const handleOverlapChange = (value: number) => {
    const newFormData = {
      ...formData,
      overlap: value.toString()
    };
    setFormData(newFormData);
    updateStepsCompletion(newFormData, uploadedFiles);
  }

  const visionProviders = [
    { key: "openai", label: "OpenAI GPT-4V", model: "gpt-4o-mini", envKey: "OPENAI_API_KEY" },
    { key: "anthropic", label: "Anthropic Claude 3", model: "claude-3-opus-20240229", envKey: "ANTHROPIC_API_KEY" },
    { key: "gemini", label: "Google Gemini", model: "gemini/gpt-4o-mini", envKey: "GEMINI_API_KEY" },
  ];

  const renderVisionModelSettings = () => {
    // Show vision model settings if there are any PDF files
    if (uploadedFiles.some(f => f.name.toLowerCase().endsWith('.pdf'))) {
      return (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <div className="flex items-center gap-2">
            <Switch
              isSelected={formData.useVisionModel}
              onValueChange={(value) => handleInputChange('useVisionModel', value)}
              size="sm"
            >
              Enable Vision Model for PDF Processing
            </Switch>
            <Tooltip content="Use AI vision models to better understand document layout and extract text">
              <Info className="w-4 h-4 text-default-400" />
            </Tooltip>
          </div>

          {formData.useVisionModel && (
            <div className="space-y-4">
              <Select
                label="Vision Model Provider"
                placeholder="Select vision model provider"
                selectedKeys={[formData.visionProvider]}
                onSelectionChange={(keys) => {
                  const provider = Array.from(keys)[0].toString();
                  const model = visionProviders.find(p => p.key === provider)?.model || 'gpt-4o-mini';
                  handleInputChange('visionProvider', provider);
                  handleInputChange('visionModel', model);
                }}
                className="max-w-md"
              >
                {visionProviders.map((provider) => (
                  <SelectItem key={provider.key} value={provider.key}>
                    {provider.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const handleFilesChange = (newFiles: File[]) => {
    setUploadedFiles(newFiles);
    updateStepsCompletion(formData, newFiles);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    label="Knowledge Base Name"
                    placeholder="Optional - Enter a name or leave empty for a random name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full"
                    endContent={
                      <Tooltip content="Leave empty for a randomly generated name">
                        <Info className="w-4 h-4 text-default-400" />
                      </Tooltip>
                    }
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
                <div className="space-y-2">
                  <Textarea
                    label="Description"
                    placeholder="Optional - Enter a description for your knowledge base"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <Divider className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Upload Documents (Optional)</span>
                    <Tooltip content="You can upload documents now or add them later">
                      <Info className="w-4 h-4 text-default-400" />
                    </Tooltip>
                  </div>
                  <Chip
                    variant="flat"
                    color="primary"
                    size="sm"
                    className="capitalize"
                  >
                    Optional
                  </Chip>
                </div>

                <Alert className="mb-4">
                  You can create an empty knowledge base now and add documents later. This is useful if you want to set up the configuration first.
                </Alert>

                <FileUploadBox onFilesChange={handleFilesChange} />
              </div>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="flex flex-col gap-8">
            {renderVisionModelSettings()}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Text Processing</h3>
                  <Tooltip content="Configure how your documents will be processed and split into chunks">
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

                {formData.chunkingMode === 'manual' && (
                  <div className="grid grid-cols-2 gap-6 p-4 bg-default-50 rounded-lg">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Chunk Size</span>
                          <Tooltip content="Number of tokens per chunk. Larger chunks provide more context but may be less precise">
                            <Info className="w-4 h-4 text-default-400" />
                          </Tooltip>
                        </div>
                        <Chip size="sm" variant="flat">{formData.chunkSize} tokens</Chip>
                      </div>
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
                          { value: 500, label: "500" },
                          { value: 1000, label: "1000" },
                          { value: 1500, label: "1500" },
                        ]}
                        aria-label="Chunk Size"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Chunk Overlap</span>
                          <Tooltip content="Number of overlapping tokens between chunks to maintain context">
                            <Info className="w-4 h-4 text-default-400" />
                          </Tooltip>
                        </div>
                        <Chip size="sm" variant="flat">{formData.overlap} tokens</Chip>
                      </div>
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
                          { value: 100, label: "100" },
                          { value: 200, label: "200" },
                          { value: 300, label: "300" },
                        ]}
                        aria-label="Chunk Overlap"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
            {renderEmbeddingAndRetrievalSection()}
          </div>
        )
      case 2:
        return (
          <div className="flex flex-col gap-6">
            {jobStatus ? (
              renderProcessingStep()
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Review and Create</h3>
                  <p className="text-sm text-default-400">
                    Review your settings and create your knowledge base.
                  </p>
                </div>

                <Card className="p-4">
                  <CardBody className="gap-4">
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium">Name</span>
                        <p className="text-sm text-default-400">{formData.name}</p>
                      </div>
                      {formData.description && (
                        <div>
                          <span className="text-sm font-medium">Description</span>
                          <p className="text-sm text-default-400">{formData.description}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium">Files</span>
                        <p className="text-sm text-default-400">{uploadedFiles.length} files selected</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Embedding Model</span>
                        <p className="text-sm text-default-400">{embeddingModels[formData.embeddingModel]?.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Vector Database</span>
                        <p className="text-sm text-default-400">{vectorStores[formData.vectorDb]?.name}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      // If we're on the first step and no name is provided, generate one
      if (currentStep === 0 && !formData.name.trim()) {
        const randomName = generateRandomName();
        handleInputChange('name', randomName);
        setNameAlert(`Using generated name: ${randomName}`);
      }
      setCurrentStep(currentStep + 1)
    } else {
      try {
        // If we're creating and no name is provided, generate one
        let finalName = formData.name;
        if (!finalName.trim()) {
          finalName = generateRandomName();
          handleInputChange('name', finalName);
          setNameAlert(`Using generated name: ${finalName}`);
        }

        // Prepare the request data
        const requestData: KnowledgeBaseCreateRequest = {
          name: finalName,
          description: formData.description,
          data_source: uploadedFiles.length > 0 ? {
            type: 'upload',
            files: uploadedFiles,
          } : undefined,
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
        const response = await createKnowledgeBase(requestData)

        // Only start polling if files were uploaded
        if (uploadedFiles.length > 0) {
          startPollingJobStatus(response.id);
        } else {
          // Redirect immediately for empty knowledge bases
          router.push('/rag');
        }

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

  const renderEmbeddingSection = () => (
    <Select
      label="Embedding Model"
      placeholder="Select embedding model"
      selectedKeys={[formData.embeddingModel]}
      onChange={(e) => handleInputChange('embeddingModel', e.target.value)}
      isLoading={isLoadingModels}
      classNames={{
        trigger: "h-12",
      }}
    >
      {(() => {
        const groupedModels = Object.entries(embeddingModels).reduce((groups, [modelId, modelInfo]) => {
          const provider = modelInfo.provider;
          if (!groups[provider]) {
            groups[provider] = [];
          }
          groups[provider].push({ ...modelInfo, id: modelId });
          return groups;
        }, {} as Record<string, (EmbeddingModelConfig & { id: string })[]>);

        return Object.entries(groupedModels).map(([provider, models], index, entries) => (
          <SelectSection
            key={provider}
            title={provider}
            showDivider={index < entries.length - 1}
          >
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id} textValue={model.name}>
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  <span className="text-tiny text-default-400">
                    {model.dimensions} dimensions
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectSection>
        ));
      })()}
    </Select>
  );

  const renderVectorStoreSection = () => (
    <Select
      label="Vector Database"
      placeholder="Select vector database"
      selectedKeys={[formData.vectorDb]}
      onChange={(e) => handleInputChange('vectorDb', e.target.value)}
      isLoading={isLoadingStores}
      classNames={{
        trigger: "h-12",
      }}
    >
      {Object.entries(vectorStores).map(([storeId, store]) => (
        <SelectItem key={storeId} textValue={store.name}>
          <div className="flex flex-col">
            <span>{store.name}</span>
            <span className="text-tiny text-default-400">{store.description}</span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );

  const renderEmbeddingAndRetrievalSection = () => (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Embedding & Retrieval</h3>
          <Tooltip content="Configure how your text will be converted to vector embeddings and searched">
            <Info className="w-4 h-4 text-default-400" />
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {renderEmbeddingSection()}
            {formData.embeddingModel && (
              <ApiKeyWarning modelInfo={embeddingModels[formData.embeddingModel]} />
            )}
          </div>
          <div className="space-y-2">
            {renderVectorStoreSection()}
            {formData.vectorDb && (
              <ApiKeyWarning storeInfo={vectorStores[formData.vectorDb]} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Search Strategy</span>
            <Tooltip content="Choose how documents will be retrieved from your knowledge base">
              <Info className="w-4 h-4 text-default-400" />
            </Tooltip>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card
              isPressable
              className={`p-4 cursor-pointer transition-all duration-300 ${
                formData.searchStrategy === 'vector'
                  ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                  : ''
              }`}
              onClick={() => handleInputChange('searchStrategy', 'vector')}
            >
              <CardBody className="p-0">
                <h4 className="font-semibold mb-1">Vector Search</h4>
                <p className="text-xs text-default-500">Semantic search using vector similarity</p>
              </CardBody>
            </Card>
            <Card
              isDisabled
              className="p-4 cursor-not-allowed opacity-50"
            >
              <CardBody className="p-0">
                <h4 className="font-semibold mb-1">Full-text Search</h4>
                <p className="text-xs text-default-500">Traditional keyword-based search (Coming Soon)</p>
              </CardBody>
            </Card>
            <Card
              isDisabled
              className="p-4 cursor-not-allowed opacity-50"
            >
              <CardBody className="p-0">
                <h4 className="font-semibold mb-1">Hybrid Search</h4>
                <p className="text-xs text-default-500">Combine vector and keyword search (Coming Soon)</p>
              </CardBody>
            </Card>
          </div>
        </div>

        {formData.searchStrategy === 'hybrid' && (
          <Card className="p-4 bg-default-50">
            <CardBody className="p-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Search Weight Balance</span>
                    <Tooltip content="Balance between semantic and keyword search">
                      <Info className="w-4 h-4 text-default-400" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip color="primary" variant="flat" size="sm">Semantic {formData.semanticWeight}</Chip>
                    <span className="text-sm text-default-400">/</span>
                    <Chip color="success" variant="flat" size="sm">Keyword {formData.keywordWeight}</Chip>
                  </div>
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Top K Results"
                  placeholder="Enter Top K value"
                  value={formData.topK}
                  onChange={(e) => handleInputChange('topK', e.target.value)}
                  min={1}
                  max={100}
                  startContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">K</span>
                    </div>
                  }
                />
                <Input
                  type="number"
                  label="Score Threshold"
                  placeholder="Enter threshold"
                  value={formData.scoreThreshold}
                  onChange={(e) => handleInputChange('scoreThreshold', e.target.value)}
                  min={0}
                  max={1}
                  step={0.1}
                  startContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">≥</span>
                    </div>
                  }
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </Card>
  );

  const ApiKeyWarning = ({ modelInfo, storeInfo }: { modelInfo?: EmbeddingModelConfig, storeInfo?: VectorStoreConfig }) => {
    let missingParams: string[] = [];
    let serviceName = '';

    if (modelInfo) {
      // For model providers, check their required parameters
      modelInfo.required_env_vars.forEach(envVar => {
        if (!apiKeys[envVar] || apiKeys[envVar] === '') {
          missingParams.push(envVar);
        }
      });
      serviceName = modelInfo.name;
    } else if (storeInfo) {
      // For vector store providers, check all their required parameters
      storeInfo.required_env_vars.forEach(envVar => {
        if (!apiKeys[envVar] || apiKeys[envVar] === '') {
          missingParams.push(envVar);
        }
      });
      serviceName = storeInfo.name;
    } else {
      return null;
    }

    // Only show warning if there are missing required parameters
    if (missingParams.length > 0) {
      return (
        <Alert
          className="mt-2"
          color="warning"
          title={`Missing Configuration for ${serviceName}`}
        >
          {missingParams.length === 1
            ? `Please set the ${missingParams[0]} in Settings > API Keys before using this service.`
            : `Please set the following in Settings > API Keys before using this service: ${missingParams.join(', ')}`}
        </Alert>
      );
    }

    return null;
  };

  const renderProcessingStep = () => {
    if (!jobStatus) return null;

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{jobStatus.current_step}</span>
            <span className="text-sm text-default-400">{Math.round(jobStatus.progress * 100)}%</span>
          </div>
          <Progress
            value={jobStatus.progress * 100}
            color={jobStatus.status === 'failed' ? 'danger' : 'primary'}
            className="w-full"
          />
        </div>

        <div className="space-y-4">
          {jobStatus.total_files > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Files Processed</span>
              <span>{jobStatus.processed_files} / {jobStatus.total_files}</span>
            </div>
          )}

          {jobStatus.total_chunks > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Chunks Processed</span>
              <span>{jobStatus.processed_chunks} / {jobStatus.total_chunks}</span>
            </div>
          )}
        </div>

        {jobStatus.status === 'failed' && (
          <Alert color="danger" className="mt-4">
            {jobStatus.error_message || 'An error occurred while processing your knowledge base.'}
          </Alert>
        )}

        <div className="flex items-center gap-2 text-sm text-default-400">
          <Spinner size="sm" />
          <span>
            {jobStatus.status === 'failed'
              ? 'Processing failed'
              : jobStatus.status === 'completed'
                ? 'Processing complete'
                : 'Processing your documents...'}
          </span>
        </div>
      </div>
    );
  };

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
                base: "mb-4",
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

            <AnimatePresence>
              {nameAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert
                    className="mb-4"
                    color="primary"
                    startContent={<Info className="h-4 w-4" />}
                  >
                    {nameAlert}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

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