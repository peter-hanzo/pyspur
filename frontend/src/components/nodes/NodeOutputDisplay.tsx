import React from 'react'
import Markdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter/dist/cjs/prism'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface NodeOutputDisplayProps {
    output: Record<string, any>
}

const NodeOutputDisplay: React.FC<NodeOutputDisplayProps> = ({ output }) => {
    const detectLanguage = (code: string): string => {
        // Python indicators
        if (code.includes('def ') || code.includes('import ') || /:\s*\n\s+/.test(code)) {
            return 'python'
        }
        // C++ indicators
        if (
            code.includes('#include') ||
            /\b(cout|cin|endl)\b/.test(code) ||
            /\b(int|void|class)\s+\w+\s*\(/.test(code)
        ) {
            return 'cpp'
        }
        // TypeScript/JavaScript indicators
        if (code.includes('interface ') || code.includes('type ') || code.includes('const ') || /=>\s*{/.test(code)) {
            return 'typescript'
        }
        if (code.includes('function ') || code.includes('let ') || code.includes('var ')) {
            return 'javascript'
        }
        // Default to typescript if we can't determine
        return 'typescript'
    }

    const isCodeBlock = (value: any): boolean => {
        // Check if the value is a string and looks like code
        if (typeof value !== 'string') return false
        // More comprehensive heuristic for code detection
        const codeIndicators = [
            // General syntax
            '{',
            '}',
            '()',
            '=>',
            ';',
            // Function definitions
            'function',
            'def ',
            'class ',
            // Variable declarations
            'const ',
            // 'let ',
            'var ',
            'int ',
            'float ',
            // Imports
            // 'import ',
            // 'from ',
            '#include',
            // Control structures
            // 'if ',
            // 'for ',
            // 'while ',
            // 'return ',
        ]
        return value.includes('\n') && codeIndicators.some((indicator) => value.includes(indicator))
    }

    // JSON rendering logic with indentation
    const renderJsonObject = (obj: Record<string, any>) => {
        return (
            <div style={{ width: '100%' }}>
                {Object.entries(obj).map(([key, val]) => (
                    <div
                        key={key}
                        style={{
                            marginBottom: '8px',
                            marginLeft: '0.5rem',
                            borderLeft: '2px solid #ccc',
                            paddingLeft: '0.5rem',
                        }}
                    >
                        <div style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '4px' }}>{key}:</div>
                        <div style={{ marginLeft: '10px' }}>{renderValue(val)}</div>
                    </div>
                ))}
            </div>
        )
    }
    const renderValue = (value: any) => {
        // Handle JSON objects recursively
        if (typeof value === 'object' && value !== null) {
            return renderJsonObject(value)
        }

        // Try parsing string as JSON
        if (typeof value === 'string') {
            try {
                const jsonValue = JSON.parse(value)
                if (typeof jsonValue === 'object' && jsonValue !== null) {
                    return renderJsonObject(jsonValue)
                }
            } catch (e) {
                // Not valid JSON, continue with other checks
            }
        }

        // Handle code blocks
        if (isCodeBlock(value)) {
            const language = detectLanguage(value)
            return (
                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{ borderRadius: '8px', padding: '12px' }}
                >
                    {value}
                </SyntaxHighlighter>
            )
        }
        // Handle data URIs
        if (typeof value === 'string' && value.startsWith('data:')) {
            const [header, data] = value.split(',')
            const mimeType = header.split(';')[0].split(':')[1]

            // Handle PDF files
            if (mimeType === 'application/pdf') {
                return (
                    <iframe
                        src={value}
                        style={{ width: '100%', height: '500px', border: 'none' }}
                        title="PDF Preview"
                    />
                )
            }

            // Handle images
            if (mimeType.startsWith('image/')) {
                return <img src={value} alt="Image Preview" style={{ maxWidth: '100%', maxHeight: '500px' }} />
            }

            // Handle video
            if (mimeType.startsWith('video/')) {
                return (
                    <video controls style={{ maxWidth: '100%', maxHeight: '500px' }}>
                        <source src={value} type={mimeType} />
                        Your browser does not support the video tag.
                    </video>
                )
            }

            // Handle audio
            if (mimeType.startsWith('audio/')) {
                return (
                    <audio controls style={{ width: '100%' }}>
                        <source src={value} type={mimeType} />
                        Your browser does not support the audio tag.
                    </audio>
                )
            }

            // Handle text files
            if (mimeType.startsWith('text/')) {
                try {
                    const decodedText = atob(data)
                    if (isCodeBlock(decodedText)) {
                        const language = detectLanguage(decodedText)
                        return (
                            <SyntaxHighlighter
                                language={language}
                                style={oneDark}
                                customStyle={{
                                    margin: 0,
                                    borderRadius: '8px',
                                    padding: '12px',
                                }}
                            >
                                {decodedText}
                            </SyntaxHighlighter>
                        )
                    }
                    return <Markdown>{decodedText}</Markdown>
                } catch (e) {
                    console.error('Error decoding base64:', e)
                    return <div>Error decoding content</div>
                }
            }

            return <div>Unsupported data URI format</div>
        }

        // Handle regular code blocks
        if (isCodeBlock(value)) {
            const language = detectLanguage(value)
            return (
                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                        margin: 0,
                        borderRadius: '8px',
                        padding: '12px',
                    }}
                >
                    {value}
                </SyntaxHighlighter>
            )
        }

        return <Markdown>{JSON.stringify(value, null, 1)}</Markdown>
    }

    return (
        <>
            {output && (
                <div
                    className="p-5"
                    style={{
                        overflowY: 'auto',
                        touchAction: 'none',
                    }}
                    onWheelCapture={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <div>
                        {Object.entries(output).map(([key, value]) => (
                            <div key={key} className="my-2 flex flex-col items-start">
                                <label className="text-sm font-semibold mb-1 block">{key}:</label>
                                <div className="ml-2 mt-auto w-full">{renderValue(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}

export default NodeOutputDisplay
