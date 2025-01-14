import React, { useEffect, useState } from 'react';
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
  Chip,
  Spinner,
  Alert,
} from '@nextui-org/react';
import { Info, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  createVectorIndex,
  getEmbeddingModels,
  getVectorStores,
  listDocumentCollections,
} from '@/utils/api';
import type {
  DocumentCollectionResponse,
  EmbeddingModelConfig,
  VectorStoreConfig,
  VectorIndexCreateRequest,
} from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface EmbeddingConfig {
  name: string;
  description: string;
  collection_id: string;
  embedding_model: string;
  vector_db: string;
  search_strategy: string;
}

const steps = [
  {
    title: 'Select Collection',
    description: 'Choose a document collection to create an index from',
    isCompleted: false,
  },
  {
    title: 'Configure Embeddings',
    description: 'Configure embedding model and vector store settings',
    isCompleted: false,
  },
  {
    title: 'Create Index',
    description: 'Review and create your vector index',
    isCompleted: false,
  },
];

export const VectorIndexWizard: React.FC = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collections, setCollections] = useState<DocumentCollectionResponse[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<Record<string, EmbeddingModelConfig>>({});
  const [vectorStores, setVectorStores] = useState<Record<string, VectorStoreConfig>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [config, setConfig] = useState<EmbeddingConfig>({
    name: '',
    description: '',
    collection_id: '',
    embedding_model: '',
    vector_db: '',
    search_strategy: 'vector',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [collectionsData, modelsData, storesData] = await Promise.all([
          listDocumentCollections(),
          getEmbeddingModels(),
          getVectorStores(),
        ]);
        setCollections(collectionsData);
        setEmbeddingModels(modelsData);
        setVectorStores(storesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setAlert({ type: 'error', message: 'Error loading configuration options' });
      }
    };
    fetchData();
  }, []);

  // Clear alert after 3 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const createRequest: VectorIndexCreateRequest = {
        name: config.name,
        description: config.description,
        collection_id: config.collection_id,
        embedding: {
          model: config.embedding_model,
          vector_db: config.vector_db,
          search_strategy: config.search_strategy,
          semantic_weight: 1.0,
          keyword_weight: 0.0,
          top_k: 3,
          score_threshold: 0.7,
        },
      };
      const index = await createVectorIndex(createRequest);
      setAlert({ type: 'success', message: 'Vector index created successfully' });
      router.push(`/rag/indices/${index.id}`);
    } catch (error) {
      console.error('Error creating index:', error);
      setAlert({ type: 'error', message: 'Error creating vector index' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfigChange = (field: keyof EmbeddingConfig) => (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const value = event.target.value;
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Select
              label="Document Collection"
              placeholder="Select a document collection"
              selectedKeys={config.collection_id ? [config.collection_id] : []}
              onChange={(e) => handleConfigChange('collection_id')(e as any)}
              isRequired
            >
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <Input
              label="Index Name"
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
              <Select
                label="Embedding Model"
                placeholder="Select embedding model"
                selectedKeys={config.embedding_model ? [config.embedding_model] : []}
                onChange={(e) => handleConfigChange('embedding_model')(e as any)}
                isRequired
              >
                {Object.entries(embeddingModels).map(([id, model]) => (
                  <SelectItem key={id} value={id}>
                    {model.name}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Vector Database"
                placeholder="Select vector database"
                selectedKeys={config.vector_db ? [config.vector_db] : []}
                onChange={(e) => handleConfigChange('vector_db')(e as any)}
                isRequired
              >
                {Object.entries(vectorStores).map(([id, store]) => (
                  <SelectItem key={id} value={id}>
                    {store.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        );

      case 2:
        const selectedCollection = collections.find(
          (c) => c.id === config.collection_id
        );
        return (
          <Card>
            <CardBody className="gap-4">
              <div className="text-lg font-semibold">Review Configuration</div>
              <div className="space-y-4">
                <div>
                  <div className="font-medium">Collection:</div>
                  <div className="text-default-500">
                    {selectedCollection?.name || config.collection_id}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Index Name:</div>
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
                    <div className="font-medium">Embedding Model:</div>
                    <div className="text-default-500">
                      {embeddingModels[config.embedding_model]?.name || config.embedding_model}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Vector Database:</div>
                    <div className="text-default-500">
                      {vectorStores[config.vector_db]?.name || config.vector_db}
                    </div>
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
              <h1 className="text-3xl font-bold text-default-900">Create Vector Index</h1>
              <p className="text-small text-default-400">Follow the steps to configure your vector index settings.</p>
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
                      (activeStep === 0 && !config.collection_id) ||
                      (activeStep === 1 && (!config.name || !config.embedding_model || !config.vector_db))
                    }
                  >
                    {activeStep === steps.length - 1 ? 'Create Index' : 'Next'}
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