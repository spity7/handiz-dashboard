import axios from 'axios'
import { API_BASE_URL } from '@/config/api'

const IMAGE_EXTENSION_PATTERN = /\.(avif|webp|jpe?g|png|gif)$/i

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

const getExtensionFromUrl = (url) => {
  try {
    const match = new URL(url).pathname.match(IMAGE_EXTENSION_PATTERN)
    return match ? match[0] : '.jpg'
  } catch {
    return '.jpg'
  }
}

export const getFilenameFromUrl = (url, fallback = 'image') => {
  try {
    const segment = new URL(url).pathname.split('/').pop()
    const decoded = decodeURIComponent(segment || '')
    const basename = decoded.split('/').pop()
    if (basename) return basename
  } catch {
    // ignore invalid URLs
  }
  return fallback
}

export const buildProjectImageFilename = (projectTitle, label, url) => {
  const slug = (projectTitle || 'project')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 60)
  const fromUrl = getFilenameFromUrl(url)
  if (fromUrl && fromUrl !== 'image') return `${slug}_${label}_${fromUrl}`
  return `${slug}_${label}${getExtensionFromUrl(url)}`
}

export const getProjectDownloadableImages = (project) => {
  if (!project) return []

  const images = []
  const title = project.title

  if (project.thumbnailUrl) {
    images.push({
      label: 'thumbnail',
      url: project.thumbnailUrl,
      filename: buildProjectImageFilename(title, 'thumbnail', project.thumbnailUrl),
    })
  }

  if (Array.isArray(project.gallery)) {
    project.gallery.forEach((url, index) => {
      images.push({
        label: `gallery_${index + 1}`,
        url,
        filename: buildProjectImageFilename(title, `gallery_${index + 1}`, url),
      })
    })
  }

  if (Array.isArray(project.contentBlocks)) {
    project.contentBlocks.forEach((block, index) => {
      if (block.type === 'image' && block.content?.trim()) {
        const url = block.content.trim()
        images.push({
          label: `content_${index + 1}`,
          url,
          filename: buildProjectImageFilename(title, `content_${index + 1}`, url),
        })
      }
    })
  }

  return images
}

const slugifyProjectTitle = (projectTitle) =>
  (projectTitle || 'project')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 60) || 'project'

const triggerBlobDownload = (blob, filename) => {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

const parseFilenameFromDisposition = (disposition, fallback) => {
  if (!disposition) return fallback
  const match = disposition.match(/filename="([^"]+)"/i)
  return match?.[1] || fallback
}

export async function downloadProjectImage(projectId, label) {
  const response = await api.get(`/projects/${projectId}/images/file`, {
    params: { label },
    responseType: 'blob',
  })

  if (response.data.type === 'application/json') {
    const text = await response.data.text()
    const payload = JSON.parse(text)
    throw new Error(payload.message || 'Failed to download image')
  }

  const filename = parseFilenameFromDisposition(response.headers['content-disposition'], `${label}.jpg`)
  triggerBlobDownload(response.data, filename)
}

export async function downloadProjectImagesZip(projectId, projectTitle) {
  const response = await api.get(`/projects/${projectId}/images/zip`, {
    responseType: 'blob',
  })

  if (response.data.type === 'application/json') {
    const text = await response.data.text()
    const payload = JSON.parse(text)
    throw new Error(payload.message || 'Failed to download images')
  }

  const filename = parseFilenameFromDisposition(response.headers['content-disposition'], `${slugifyProjectTitle(projectTitle)}_images.zip`)
  triggerBlobDownload(response.data, filename)
}
