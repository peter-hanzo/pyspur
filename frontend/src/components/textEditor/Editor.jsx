'use client'

import React, { useState } from 'react'
import TextEditor from './TextEditor'

const Editor = () => {
  const [content, setContent] = useState('')
  const handleContentChange = (input) => {
    setContent(input)
  }
  return (
    <TextEditor
      content={content}
      onChange={handleContentChange}
    />
  )
}

export default Editor