"use client"
import React, { useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

export default function Editor() {
      const [value, setValue] = useState('')
    
      return <ReactQuill theme="snow" value={value} onChange={setValue} />
}