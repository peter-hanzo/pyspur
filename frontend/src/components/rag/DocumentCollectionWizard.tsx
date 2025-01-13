import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { createDocumentCollection } from '@/utils/api';
import type { TextProcessingConfig } from '@/utils/api';
import { useNotification } from '@/contexts/NotificationContext';

const steps = ['Upload Documents', 'Configure Processing', 'Create Collection'];

export const DocumentCollectionWizard: React.FC = () => {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<TextProcessingConfig>({
    name: '',
    description: '',
    chunk_size: 1000,
    chunk_overlap: 200,
    skip_empty_chunks: true,
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setActiveStep(1);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
  });

  const handleConfigChange = (field: keyof TextProcessingConfig) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
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
      formData.append('config', JSON.stringify(config));

      const collection = await createDocumentCollection(formData);
      showNotification('Document collection created successfully', 'success');
      router.push(`/rag/collections/${collection.id}`);
    } catch (error) {
      console.error('Error creating collection:', error);
      showNotification('Error creating document collection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <input {...getInputProps()} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the files here' : 'Drag and drop files here'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Supported formats: PDF, TXT, MD
            </Typography>
          </Box>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Collection Name"
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
              <TextField
                fullWidth
                type="number"
                label="Chunk Size"
                value={config.chunk_size}
                onChange={handleConfigChange('chunk_size')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Chunk Overlap"
                value={config.chunk_overlap}
                onChange={handleConfigChange('chunk_overlap')}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.skip_empty_chunks}
                      onChange={handleConfigChange('skip_empty_chunks')}
                    />
                  }
                  label="Skip Empty Chunks"
                />
              </FormGroup>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Review Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Files to Upload:</Typography>
                  {files.map((file) => (
                    <Typography key={file.name} color="textSecondary">
                      {file.name}
                    </Typography>
                  ))}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Collection Name:</Typography>
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
                  <Typography variant="subtitle1">Chunk Size:</Typography>
                  <Typography color="textSecondary">{config.chunk_size}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Chunk Overlap:</Typography>
                  <Typography color="textSecondary">
                    {config.chunk_overlap}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Skip Empty Chunks:</Typography>
                  <Typography color="textSecondary">
                    {config.skip_empty_chunks ? 'Yes' : 'No'}
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
              (activeStep === 0 && files.length === 0) ||
              (activeStep === 1 && !config.name)
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
            {isSubmitting ? <CircularProgress size={24} /> : 'Create Collection'}
          </Button>
        )}
      </Box>
    </Box>
  );
};