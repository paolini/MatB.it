"use client"
import React, { useState } from 'react'
import 'react-quill-new/dist/quill.snow.css'
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false, // Indica di non renderizzare questo componente lato server
});

export default function Editor() {
  const [content, setContent] = useState('');

  const handleChange = (value: string) => {
    setContent(value);
  };

  return <ReactQuill value={content} onChange={handleChange} />;
}
