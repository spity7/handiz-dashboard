/**
 * Upload a video file to VdoCipher via server-issued S3 credentials.
 * Returns the VdoCipher videoId when upload succeeds.
 */
export async function uploadVideoToVdocipher(file, { title, getCredentials }) {
  const { clientPayload, videoId } = await getCredentials(title || file.name)

  if (!clientPayload?.uploadLink || !videoId) {
    throw new Error('Invalid upload credentials from server')
  }

  const formData = new FormData()
  formData.append('x-amz-credential', clientPayload['x-amz-credential'])
  formData.append('x-amz-algorithm', clientPayload['x-amz-algorithm'])
  formData.append('x-amz-date', clientPayload['x-amz-date'])
  formData.append('x-amz-signature', clientPayload['x-amz-signature'])
  formData.append('key', clientPayload.key)
  formData.append('policy', clientPayload.policy)
  formData.append('success_action_status', '201')
  formData.append('success_action_redirect', '')
  formData.append('file', file)

  const uploadRes = await fetch(clientPayload.uploadLink, {
    method: 'POST',
    body: formData,
  })

  if (!uploadRes.ok && uploadRes.status !== 201) {
    throw new Error(`Video upload failed (${uploadRes.status})`)
  }

  return videoId
}
