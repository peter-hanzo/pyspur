import React, { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from '@heroui/react'
import { Icon } from '@iconify/react'

interface CodeEditorProps {
    code: string
    onChange: (value: string) => void
    disabled?: boolean
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, disabled }) => {
    const [value, setValue] = useState<string>('')
    const { isOpen, onOpen, onOpenChange } = useDisclosure()
    const [modalValue, setModalValue] = useState<string>('')

    useEffect(() => {
        if (typeof code === 'string') {
            setValue(code)
            setModalValue(code)
        }
    }, [code])

    const handleEditorChange = (newValue: string) => {
        setValue(newValue)
        setModalValue(newValue)
        onChange(newValue)
    }

    const handleModalEditorChange = (newValue: string) => {
        setModalValue(newValue)
    }

    const handleCancel = (onClose: () => void) => {
        setModalValue(value)
        onClose()
    }

    const handleSave = (onClose: () => void) => {
        setValue(modalValue)
        onChange(modalValue)
        onClose()
    }

    return (
        <div className="code-editor w-full relative">
            <label className="text-sm font-semibold mb-2 block">Code Editor</label>
            <Button
                isIconOnly
                size="sm"
                className="absolute top-0 right-0 z-10"
                onPress={onOpen}
                disabled={disabled}
            >
                <Icon icon="solar:full-screen-linear" className="w-4 h-4" />
            </Button>
            <CodeMirror
                value={value}
                height="200px"
                theme={oneDark}
                extensions={[python(), json()]}
                onChange={handleEditorChange}
                className="border"
                editable={!disabled}
            />

            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size="5xl"
                scrollBehavior="inside"
                placement="center"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Code Editor</ModalHeader>
                            <ModalBody>
                                <CodeMirror
                                    value={modalValue}
                                    height="60vh"
                                    theme={oneDark}
                                    extensions={[python(), json()]}
                                    onChange={handleModalEditorChange}
                                    className="border"
                                    editable={!disabled}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={() => handleCancel(onClose)}>
                                    Cancel
                                </Button>
                                <Button color="primary" onPress={() => handleSave(onClose)}>
                                    Save
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    )
}

export default CodeEditor
