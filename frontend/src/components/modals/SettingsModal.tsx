'use client'

import type { CardProps, SwitchProps } from '@nextui-org/react'
import React, { useState, useEffect } from 'react'
import {
  Card,
  CardBody,
  CardFooter,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  useDisclosure,
  Input,
  extendVariants,
  Switch,
  cn,
  Divider,
  ScrollShadow,
} from '@nextui-org/react'
import { Icon } from '@iconify/react'
import { listApiKeys, setApiKey, getApiKey, deleteApiKey } from '@/utils/api'
import { useTheme } from 'next-themes'

// CellWrapper Component
const CellWrapper = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between gap-2 rounded-medium bg-content2 p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CellWrapper.displayName = 'CellWrapper'

// CustomSwitch Component
const CustomSwitch = extendVariants(Switch, {
  variants: {
    color: {
      foreground: {
        wrapper: ['group-data-[selected=true]:bg-foreground', 'group-data-[selected=true]:text-background'],
      },
    },
  },
})

// SwitchCell Component
type SwitchCellProps = Omit<SwitchProps, 'color'> & {
  label: string
  description: string
  color?: SwitchProps['color'] | 'foreground'
  classNames?: SwitchProps['classNames'] & {
    description?: string | string[]
  }
}

const SwitchCell = React.forwardRef<HTMLInputElement, SwitchCellProps>(
  ({ label, description, classNames, ...props }, ref) => (
    <CustomSwitch
      ref={ref}
      classNames={{
        ...classNames,
        base: cn(
          'inline-flex bg-content2 flex-row-reverse w-full max-w-full items-center',
          'justify-between cursor-pointer rounded-medium gap-2 p-4',
          classNames?.base
        ),
      }}
      {...props}
    >
      <div className="flex flex-col">
        <p className={cn('text-medium', classNames?.label)}>{label}</p>
        <p className={cn('text-small text-default-500', classNames?.description)}>{description}</p>
      </div>
    </CustomSwitch>
  )
)

SwitchCell.displayName = 'SwitchCell'

// APIKeys Component
const APIKeys = (props: CardProps): React.ReactElement => {
  const [keys, setKeys] = useState<{ name: string; value: string }[]>([])
  const [originalKeys, setOriginalKeys] = useState<{ name: string; value: string }[]>([])

  const fetchApiKeys = async () => {
    try {
      const response = await listApiKeys()
      const keyValues = await Promise.all(
        response.map(async (key: string) => {
          const value = await getApiKey(key)
          return { name: value.name, value: value.value }
        })
      )

      setKeys(keyValues)
      setOriginalKeys(keyValues)
    } catch (error) {
      console.error('Error fetching API keys:', error)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setKeys((prevKeys) => prevKeys.map((key) => (key.name === name ? { ...key, value: value } : key)))
  }

  const handleDeleteKey = async (name: string) => {
    try {
      await deleteApiKey(name)
      await fetchApiKeys() // Refresh the list after deletion
    } catch (error) {
      console.error('Error deleting API key:', error)
    }
  }

  const saveApiKeys = async () => {
    try {
      await Promise.all(
        keys.map(async ({ name, value }) => {
          const originalKey = originalKeys.find((k) => k.name === name)
          const trimmedValue = value.trim()

          // Only save if the value has changed from its original masked value
          if (originalKey && trimmedValue !== originalKey.value) {
            if (trimmedValue !== '') {
              await setApiKey(name, trimmedValue);
            } else {
              await handleDeleteKey(name);
            }
          }
        })
      );
      await fetchApiKeys(); // Refresh the list after saving
    } catch (error) {
      console.error("Error saving API keys:", error);
    }
  };

  const hasChanges = () => {
    return keys.some((key) => {
      const originalKey = originalKeys.find(k => k.name === key.name);
      return originalKey && key.value.trim() !== originalKey.value;
    });
  };

  // Group API keys by category
  const groupedKeys = keys.reduce((acc, key) => {
    if (key.name.includes('OPENAI') ||
        key.name.includes('AZURE_OPENAI') ||
        key.name.includes('ANTHROPIC') ||
        key.name.includes('GEMINI') ||
        key.name.includes('DEEPSEEK') ||
        key.name.includes('COHERE') ||
        key.name.includes('VOYAGE') ||
        key.name.includes('MISTRAL')) {
      acc.ai.push(key);
    } else {
      acc.vectorstore.push(key);
    }
    return acc;
  }, { ai: [], vectorstore: [] } as Record<string, typeof keys>);

  return (
    <Card {...props}>
      <CardBody className="gap-4 p-0">
        {/* AI Models Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:brain-bold" className="text-primary" width={20} />
            <div>
              <h4 className="text-medium font-medium">AI Models</h4>
              <p className="text-tiny text-default-400">API keys for Language and Embedding Models</p>
            </div>
          </div>
          <ScrollShadow className="max-h-[150px]">
            <div className="space-y-3 pr-1">
              {groupedKeys.ai.map(({ name, value }) => (
                <Input
                  key={name}
                  label={name}
                  placeholder="Enter value"
                  name={name}
                  value={value}
                  size="sm"
                  variant="bordered"
                  isClearable
                  onClear={() => handleDeleteKey(name)}
                  onFocus={() =>
                    setKeys((prevKeys) =>
                      prevKeys.map((key) => (key.name === name ? { ...key, value: '' } : key))
                    )
                  }
                  onChange={handleInputChange}
                />
              ))}
            </div>
          </ScrollShadow>
        </div>

        <Divider />

        {/* Vector Store Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:database-bold" className="text-primary" width={20} />
            <div>
              <h4 className="text-medium font-medium">Vector Databases</h4>
              <p className="text-tiny text-default-400">API keys for vector databases</p>
            </div>
          </div>
          <ScrollShadow className="max-h-[150px]">
            <div className="space-y-3 pr-1">
              {groupedKeys.vectorstore.map(({ name, value }) => (
                <Input
                  key={name}
                  label={name}
                  placeholder="Enter value"
                  name={name}
                  value={value}
                  size="sm"
                  variant="bordered"
                  isClearable
                  onClear={() => handleDeleteKey(name)}
                  onFocus={() =>
                    setKeys((prevKeys) =>
                      prevKeys.map((key) => (key.name === name ? { ...key, value: '' } : key))
                    )
                  }
                  onChange={handleInputChange}
                />
              ))}
            </div>
          </ScrollShadow>
        </div>
      </CardBody>
      {hasChanges() && (
        <CardFooter className="px-0 pt-4">
          <div className="flex gap-2 ml-auto">
            <Button
              variant="light"
              onPress={() => setKeys(originalKeys)}
              startContent={<Icon icon="solar:close-circle-bold" width={20} />}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={saveApiKeys}
              startContent={<Icon icon="solar:disk-bold" width={20} />}
            >
              Save Changes
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

// Main SettingsModal Component
const SettingsModal = (props: CardProps): JSX.Element => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const { theme, setTheme } = useTheme()

  return (
    <>
      <Button onPress={onOpen} variant="light" isIconOnly>
        <Icon className="text-default-500" icon="solar:settings-linear" width={24} />
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[90vh]",
          body: "p-0",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Settings</ModalHeader>
              <ModalBody>
                <Tabs
                  classNames={{
                    tabList: "mx-4 mt-2",
                    panel: "px-4 py-2",
                    cursor: "bg-primary/20",
                    tab: "max-w-fit px-4 h-10 data-[selected=true]:text-primary data-[selected=true]:font-medium",
                    tabContent: "group-data-[selected=true]:text-primary",
                  }}
                >
                  <Tab
                    key="appearance"
                    title={
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:palette-bold" width={20} />
                        <span>Appearance</span>
                      </div>
                    }
                  >
                    <Card className="border-none shadow-none bg-transparent">
                      <CardBody>
                        <SwitchCell
                          label="Dark Mode"
                          description="Toggle between light and dark theme"
                          isSelected={theme === 'dark'}
                          onValueChange={(isSelected) => setTheme(isSelected ? 'dark' : 'light')}
                        />
                      </CardBody>
                    </Card>
                  </Tab>
                  <Tab
                    key="api-keys"
                    title={
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:key-minimalistic-bold" width={20} />
                        <span>API Keys</span>
                      </div>
                    }
                  >
                    <APIKeys className="border-none shadow-none bg-transparent" />
                  </Tab>
                </Tabs>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default SettingsModal;
