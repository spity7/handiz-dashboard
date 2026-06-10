export const createBlockId = () => Date.now() + Math.random().toString(36)

export const buildContentBlocksFormData = (dynamicBlocks) => {
  const formData = new FormData()
  const blocksPayload = []
  let imageIndex = 0

  dynamicBlocks.forEach((block) => {
    if (block.type === 'image') {
      if (block.content instanceof File) {
        formData.append('blockImages', block.content)
        blocksPayload.push({
          type: 'image',
          fileIndex: imageIndex++,
        })
      } else {
        blocksPayload.push({
          type: 'image',
          content: block.content || '',
        })
      }
    } else {
      blocksPayload.push({
        type: block.type,
        content: block.content,
      })
    }
  })

  formData.append('contentBlocks', JSON.stringify(blocksPayload))
  return formData
}

export const mapContentBlocksFromApi = (contentBlocks = []) =>
  contentBlocks.map((block) => ({
    ...block,
    id: createBlockId(),
  }))
