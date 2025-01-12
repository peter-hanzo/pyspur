import React, { useState, useCallback } from 'react'
import { Button } from '@nextui-org/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Upload, File } from 'lucide-react'

interface FileUploadBoxProps {
  onFilesChange: (files: File[]) => void
}

const FileUploadBox: React.FC<FileUploadBoxProps> = ({ onFilesChange }) => {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles]
    setFiles(newFiles)
    onFilesChange(newFiles)
  }, [files, onFilesChange])

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
  })

  const removeFile = (name: string) => {
    const updatedFiles = files.filter(file => file.name !== name)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

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
  )
}

export default FileUploadBox