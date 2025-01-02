import React, { useState } from 'react'
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
} from '@nextui-org/react'
import { useRouter } from 'next/router'

interface Step {
  title: string
  description: string
  isCompleted: boolean
}

const KnowledgeBaseWizard: React.FC = () => {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataSource: 'files',
    chunkSize: '1000',
    overlap: '200',
    embeddings: 'openai',
  })

  const steps: Step[] = [
    {
      title: 'Basic Information',
      description: 'Enter the basic details about your knowledge base',
      isCompleted: Boolean(formData.name && formData.description),
    },
    {
      title: 'Data Source',
      description: 'Choose and configure your data source',
      isCompleted: Boolean(formData.dataSource),
    },
    {
      title: 'Processing Settings',
      description: 'Configure how your documents will be processed',
      isCompleted: Boolean(formData.chunkSize && formData.overlap),
    },
    {
      title: 'Embeddings Configuration',
      description: 'Choose and configure your embeddings model',
      isCompleted: Boolean(formData.embeddings),
    },
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <Input
              label="Name"
              placeholder="Enter knowledge base name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
            <Textarea
              label="Description"
              placeholder="Enter description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
        )
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <RadioGroup
              label="Select Data Source"
              value={formData.dataSource}
              onValueChange={(value) => handleInputChange('dataSource', value)}
            >
              <Radio value="files">Files Upload</Radio>
              <Radio value="web">Web Scraping</Radio>
              <Radio value="api">API Integration</Radio>
            </RadioGroup>
          </div>
        )
      case 3:
        return (
          <div className="flex flex-col gap-4">
            <Input
              type="number"
              label="Chunk Size"
              placeholder="Enter chunk size"
              value={formData.chunkSize}
              onChange={(e) => handleInputChange('chunkSize', e.target.value)}
            />
            <Input
              type="number"
              label="Overlap"
              placeholder="Enter overlap size"
              value={formData.overlap}
              onChange={(e) => handleInputChange('overlap', e.target.value)}
            />
          </div>
        )
      case 4:
        return (
          <div className="flex flex-col gap-4">
            <Select
              label="Embeddings Model"
              placeholder="Select an embeddings model"
              value={formData.embeddings}
              onChange={(e) => handleInputChange('embeddings', e.target.value)}
            >
              <SelectItem key="openai" value="openai">
                OpenAI Ada
              </SelectItem>
              <SelectItem key="cohere" value="cohere">
                Cohere
              </SelectItem>
              <SelectItem key="local" value="local">
                Local Model
              </SelectItem>
            </Select>
          </div>
        )
      default:
        return null
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      // Handle form submission
      console.log('Form submitted:', formData)
      router.push('/rag')
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All progress will be lost.')) {
      router.push('/rag')
    }
  }

  return (
    <div className="flex w-full gap-6 p-8">
      {/* Left side - Steps */}
      <div className="w-1/4">
        <div className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div
                className={`flex items-center gap-3 rounded-lg border p-4 ${currentStep === index + 1
                  ? 'border-primary bg-primary/10'
                  : step.isCompleted
                    ? 'border-success bg-success/10'
                    : 'border-default-200'
                  }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep === index + 1
                    ? 'bg-primary text-white'
                    : step.isCompleted
                      ? 'bg-success text-white'
                      : 'bg-default-100'
                    }`}
                >
                  {step.isCompleted ? '✓' : index + 1}
                </div>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-small text-default-400">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="ml-[19px] h-[20px] w-[2px] bg-default-200"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Content */}
      <div className="w-3/4">
        <Card>
          <CardBody className="gap-4">
            <h2 className="text-xl font-bold">{steps[currentStep - 1].title}</h2>
            <p className="text-default-400">{steps[currentStep - 1].description}</p>
            <Divider className="my-4" />
            {renderStepContent()}
            <Divider className="my-4" />
            <div className="flex justify-between">
              <Button color="danger" variant="light" onPress={handleCancel}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button variant="bordered" onPress={handleBack}>
                    Back
                  </Button>
                )}
                <Button color="primary" onPress={handleNext}>
                  {currentStep === steps.length ? 'Create' : 'Next'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default KnowledgeBaseWizard