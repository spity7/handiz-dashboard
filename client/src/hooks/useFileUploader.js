import { useState, useEffect } from 'react'
import { formatFileSize } from '@/utils/other'

export default function useFileUploader(showPreview = true, maxFiles = 30) {
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
      allFiles = maxFiles === 1 ? files.slice(0, 1) : [...selectedFiles, ...files]
      if (maxFiles > 1) {
        allFiles = allFiles.slice(0, maxFiles)
      }
      setSelectedFiles(allFiles)
    }

    if (callback) callback(allFiles)
  }

  const removeFile = (file, callback) => {
    const newFiles = selectedFiles.filter((f) => f !== file)
    setSelectedFiles(newFiles)
    if (callback) callback(newFiles)
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
