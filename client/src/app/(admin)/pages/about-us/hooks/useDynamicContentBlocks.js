import { useState } from 'react'
import { createBlockId } from '../utils/contentBlocks'

const useDynamicContentBlocks = (initialBlocks = []) => {
  const [dynamicBlocks, setDynamicBlocks] = useState(initialBlocks)

  const addBlock = (type) => {
    setDynamicBlocks((prev) => [...prev, { id: createBlockId(), type, content: '' }])
  }

  const updateBlock = (id, value) => {
    setDynamicBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, content: value } : block)))
  }

  const removeBlock = (id) => {
    setDynamicBlocks((prev) => prev.filter((block) => block.id !== id))
  }

  const moveBlock = (index, delta) => {
    setDynamicBlocks((prev) => {
      const nextIndex = index + delta
      if (nextIndex < 0 || nextIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  return {
    dynamicBlocks,
    setDynamicBlocks,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
  }
}

export default useDynamicContentBlocks
