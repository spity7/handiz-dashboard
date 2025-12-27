import { useState, useEffect } from 'react'
import { formatFileSize } from '@/utils/other'

export default function useFileUploader(showPreview = true) {
  const [selectedFiles, setSelectedFiles] = useState([])

  const handleAcceptedFiles = (files, callback) => {
    // 🧹 Handle reset case (when files is empty)
    if (!files || files.length === 0) {
      setSelectedFiles([])
      if (callback) callback([])
      return
    }

    let allFiles = []

    if (showPreview) {
      files = files.map((file) => {
        file.preview = file.type?.startsWith('image/') ? URL.createObjectURL(file) : undefined
        file.formattedSize = formatFileSize(file.size)
        return file
      })
      allFiles = [...selectedFiles, ...files]
      setSelectedFiles(allFiles)
    }

    if (callback) callback(allFiles)
  }

  const removeFile = (file) => {
    const newFiles = selectedFiles.filter((f) => f !== file)
    setSelectedFiles(newFiles)
  }

  // 🧹 Clean up URLs on unmount
  useEffect(() => {
    return () => selectedFiles.forEach((file) => URL.revokeObjectURL(file.preview))
  }, [selectedFiles])

  return {
    selectedFiles,
    handleAcceptedFiles,
    removeFile,
  }
}
