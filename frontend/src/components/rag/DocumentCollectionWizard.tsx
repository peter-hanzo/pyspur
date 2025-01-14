import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Button,
  Card,
  CardBody,
  Input,
  Textarea,
  Select,
  SelectItem,
  Progress,
  Divider,
  Switch,
  Tooltip,
  Chip,
  Alert,
  Spinner,
} from '@nextui-org/react';
import { Info, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { createDocumentCollection } from '@/utils/api';
import type { DocumentCollectionCreateRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import FileUploadBox from './FileUploadBox';

interface TextProcessingConfig {
  name: string;
  description: string;
  chunk_token_size: number;
  min_chunk_size_chars: number;
  min_chunk_length_to_embed: number;
  embeddings_batch_size: number;
  max_num_chunks: number;
  use_vision_model: boolean;
  vision_model?: string;
  vision_provider?: string;
}

const steps = ['Upload Documents', 'Configure Processing', 'Create Collection'];

const numberFields = [
  'chunk_token_size',
  'min_chunk_size_chars',
  'min_chunk_length_to_embed',
  'embeddings_batch_size',
  'max_num_chunks',
] as const;

export const DocumentCollectionWizard: React.FC = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [config, setConfig] = useState<TextProcessingConfig>({
    name: '',
    description: '',
    chunk_token_size: 1000,
    min_chunk_size_chars: 100,
    min_chunk_length_to_embed: 10,
    embeddings_batch_size: 32,
    max_num_chunks: 1000,
    use_vision_model: false,
  });

  // Clear alert after 3 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0 && activeStep === 0) {
      setActiveStep(1);
    }
  };

  const handleConfigChange = (field: keyof TextProcessingConfig) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox'
      ? event.target.checked
      : numberFields.includes(field as any)
        ? parseInt(event.target.value, 10)
        : event.target.value;
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const requestData = {
        name: config.name,
        description: config.description,
        text_processing: {
          chunk_token_size: config.chunk_token_size,
          min_chunk_size_chars: config.min_chunk_size_chars,
          min_chunk_length_to_embed: config.min_chunk_length_to_embed,
          embeddings_batch_size: config.embeddings_batch_size,
          max_num_chunks: config.max_num_chunks,
          use_vision_model: config.use_vision_model,
          ...(config.vision_model && { vision_model: config.vision_model }),
          ...(config.vision_provider && { vision_provider: config.vision_provider }),
        },
      };

      formData.append('config', JSON.stringify(requestData));

      const collection = await createDocumentCollection(formData);
      setAlert({ type: 'success', message: 'Document collection created successfully' });
      router.push(`/rag/collections/${collection.id}`);
    } catch (error) {
      console.error('Error creating collection:', error);
      setAlert({ type: 'error', message: 'Error creating document collection' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Alert className="mb-4">
              You can create an empty collection now and add documents later. This is useful if you want to set up the configuration first.
            </Alert>
            <FileUploadBox onFilesChange={handleFilesChange} />
          </div>
        );

      case 1:
        return (
          <div className="grid gap-6">
            <Input
              label="Collection Name"
              value={config.name}
              onChange={handleConfigChange('name')}
              isRequired
            />
            <Textarea
              label="Description"
              value={config.description}
              onChange={handleConfigChange('description')}
              minRows={3}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Chunk Token Size"
                value={config.chunk_token_size.toString()}
                onChange={handleConfigChange('chunk_token_size')}
                isRequired
              />
              <Input
                type="number"
                label="Min Chunk Size (chars)"
                value={config.min_chunk_size_chars.toString()}
                onChange={handleConfigChange('min_chunk_size_chars')}
                isRequired
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Min Length to Embed"
                value={config.min_chunk_length_to_embed.toString()}
                onChange={handleConfigChange('min_chunk_length_to_embed')}
                isRequired
              />
              <Input
                type="number"
                label="Batch Size"
                value={config.embeddings_batch_size.toString()}
                onChange={handleConfigChange('embeddings_batch_size')}
                isRequired
              />
            </div>
            <Input
              type="number"
              label="Max Number of Chunks"
              value={config.max_num_chunks.toString()}
              onChange={handleConfigChange('max_num_chunks')}
              isRequired
            />
            <div className="flex items-center gap-2">
              <Switch
                isSelected={config.use_vision_model}
                onValueChange={(checked) => setConfig(prev => ({ ...prev, use_vision_model: checked }))}
              />
              <span>Use Vision Model for PDFs</span>
            </div>
            {config.use_vision_model && (
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Vision Model"
                  placeholder="Select vision model"
                  selectedKeys={config.vision_model ? [config.vision_model] : []}
                  onChange={(e) => handleConfigChange('vision_model')(e as any)}
                >
                  <SelectItem key="gpt-4-vision" value="gpt-4-vision">GPT-4 Vision</SelectItem>
                  <SelectItem key="claude-3" value="claude-3">Claude 3</SelectItem>
                </Select>
                <Select
                  label="Vision Provider"
                  placeholder="Select provider"
                  selectedKeys={config.vision_provider ? [config.vision_provider] : []}
                  onChange={(e) => handleConfigChange('vision_provider')(e as any)}
                >
                  <SelectItem key="openai" value="openai">OpenAI</SelectItem>
                  <SelectItem key="anthropic" value="anthropic">Anthropic</SelectItem>
                </Select>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <Card>
            <CardBody className="gap-4">
              <div className="text-lg font-semibold">Review Configuration</div>
              <div className="space-y-4">
                <div>
                  <div className="font-medium">Files to Upload:</div>
                  {files.map((file) => (
                    <div key={file.name} className="text-default-500">
                      {file.name}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-medium">Collection Name:</div>
                  <div className="text-default-500">{config.name}</div>
                </div>
                {config.description && (
                  <div>
                    <div className="font-medium">Description:</div>
                    <div className="text-default-500">{config.description}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium">Chunk Token Size:</div>
                    <div className="text-default-500">{config.chunk_token_size}</div>
                  </div>
                  <div>
                    <div className="font-medium">Min Chunk Size:</div>
                    <div className="text-default-500">{config.min_chunk_size_chars} chars</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium">Min Length to Embed:</div>
                    <div className="text-default-500">{config.min_chunk_length_to_embed}</div>
                  </div>
                  <div>
                    <div className="font-medium">Batch Size:</div>
                    <div className="text-default-500">{config.embeddings_batch_size}</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium">Max Chunks:</div>
                  <div className="text-default-500">{config.max_num_chunks}</div>
                </div>
                <div>
                  <div className="font-medium">Vision Model:</div>
                  <div className="text-default-500">
                    {config.use_vision_model ? 'Enabled' : 'Disabled'}
                    {config.use_vision_model && config.vision_model && (
                      <> ({config.vision_model} via {config.vision_provider})</>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        );

      default:
        return null;
    }
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
              <h1 className="text-3xl font-bold text-default-900">Create Document Collection</h1>
              <p className="text-small text-default-400">Follow the steps to configure your document collection settings.</p>
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
              value={(activeStep / (steps.length - 1)) * 100}
              showValueLabel={true}
              valueLabel={`${activeStep + 1} of ${steps.length}`}
            />

            <AnimatePresence>
              {alert && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert
                    className="mb-4"
                    color={alert.type}
                    startContent={alert.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  >
                    {alert.message}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-4">
              {steps.map((step, index) => (
                <motion.button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`flex flex-col gap-1 rounded-xl border-1 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                    ${activeStep === index
                      ? 'border-primary bg-primary/5 shadow-md'
                      : index < activeStep
                        ? 'border-success/50 bg-success/5'
                        : 'border-default-200 dark:border-default-100'
                    }`}
                  disabled={index > activeStep}
                  whileHover={{ scale: index <= activeStep ? 1.02 : 1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors duration-300
                        ${activeStep === index
                          ? 'bg-primary text-white shadow-md'
                          : index < activeStep
                            ? 'bg-success text-white'
                            : 'bg-default-100 text-default-600'
                        }`}
                    >
                      {index < activeStep ? '✓' : index + 1}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-default-900">{step}</span>
                      {index === 0 && (
                        <span className="text-xs text-default-400">Upload your documents or create an empty collection</span>
                      )}
                      {index === 1 && (
                        <span className="text-xs text-default-400">Configure text processing settings</span>
                      )}
                      {index === 2 && (
                        <span className="text-xs text-default-400">Review and create your collection</span>
                      )}
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
              {renderStepContent(activeStep)}

              <Divider className="my-4" />

              <div className="flex justify-between items-center">
                <Button
                  color="danger"
                  variant="light"
                  onPress={() => router.back()}
                  className="font-medium hover:bg-danger/10"
                >
                  Cancel
                </Button>
                <div className="flex gap-3">
                  {activeStep > 0 && (
                    <Button
                      variant="bordered"
                      onPress={handleBack}
                      className="font-medium"
                      startContent={<ArrowLeft size={18} />}
                      isDisabled={isSubmitting}
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    color="primary"
                    onPress={activeStep === steps.length - 1 ? handleSubmit : handleNext}
                    className="font-medium"
                    endContent={activeStep !== steps.length - 1 && <ArrowRight size={18} />}
                    isLoading={isSubmitting}
                    isDisabled={
                      (activeStep === 0 && files.length === 0) ||
                      (activeStep === 1 && !config.name)
                    }
                  >
                    {activeStep === steps.length - 1 ? 'Create Collection' : 'Next'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};