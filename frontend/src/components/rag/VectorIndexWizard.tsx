import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  createVectorIndex,
  getEmbeddingModels,
  getVectorStores,
  listDocumentCollections,
} from '@/utils/api';
import type {
  DocumentCollectionResponse,
  EmbeddingConfig,
} from '@/utils/api';
import { useNotification } from '@/contexts/NotificationContext';

const steps = ['Select Collection', 'Configure Embeddings', 'Create Index'];

export const VectorIndexWizard: React.FC = () => {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collections, setCollections] = useState<DocumentCollectionResponse[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<string[]>([]);
  const [vectorStores, setVectorStores] = useState<string[]>([]);
  const [config, setConfig] = useState<EmbeddingConfig>({
    name: '',
    description: '',
    collection_id: '',
    embedding_model: '',
    vector_db: '',
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
        showNotification('Error loading configuration options', 'error');
      }
    };
    fetchData();
  }, [showNotification]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const index = await createVectorIndex(config);
      showNotification('Vector index created successfully', 'success');
      router.push(`/rag/indices/${index.id}`);
    } catch (error) {
      console.error('Error creating index:', error);
      showNotification('Error creating vector index', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfigChange = (field: keyof EmbeddingConfig) => (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    const value = event.target.value;
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Document Collection</InputLabel>
                <Select
                  value={config.collection_id}
                  onChange={handleConfigChange('collection_id')}
                  label="Document Collection"
                >
                  {collections.map((collection) => (
                    <MenuItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Index Name"
                value={config.name}
                onChange={handleConfigChange('name')}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={config.description}
                onChange={handleConfigChange('description')}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Embedding Model</InputLabel>
                <Select
                  value={config.embedding_model}
                  onChange={handleConfigChange('embedding_model')}
                  label="Embedding Model"
                >
                  {embeddingModels.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Vector Database</InputLabel>
                <Select
                  value={config.vector_db}
                  onChange={handleConfigChange('vector_db')}
                  label="Vector Database"
                >
                  {vectorStores.map((store) => (
                    <MenuItem key={store} value={store}>
                      {store}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 2:
        const selectedCollection = collections.find(
          (c) => c.id === config.collection_id
        );
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Review Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Collection:</Typography>
                  <Typography color="textSecondary">
                    {selectedCollection?.name || config.collection_id}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Index Name:</Typography>
                  <Typography color="textSecondary">{config.name}</Typography>
                </Grid>
                {config.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Description:</Typography>
                    <Typography color="textSecondary">
                      {config.description}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Embedding Model:</Typography>
                  <Typography color="textSecondary">
                    {config.embedding_model}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Vector Database:</Typography>
                  <Typography color="textSecondary">
                    {config.vector_db}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 2, mb: 4 }}>{renderStepContent(activeStep)}</Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={
              (activeStep === 0 && !config.collection_id) ||
              (activeStep === 1 &&
                (!config.name ||
                  !config.embedding_model ||
                  !config.vector_db))
            }
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Create Index'}
          </Button>
        )}
      </Box>
    </Box>
  );
};