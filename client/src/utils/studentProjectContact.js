import { HANDIZ_WEBSITE_URL } from '@/config/api'

export function getStudentProjectPublicUrl(project) {
  if (!project?._id) return null

  const base = HANDIZ_WEBSITE_URL.replace(/\/$/, '')
  return `${base}/student-project/${project._id}`
}

export function buildStudentProjectWhatsAppMessage(project) {
  if (!project) return ''

  const owner = project.createdBy
  const greetingName = owner?.firstname || owner?.username || 'there'
  const lines = [`Hi ${greetingName},`, '', `Regarding your student project "${project.title || 'Untitled'}":`]

  if (project.student) lines.push(`Student: ${project.student}`)
  if (project.status) lines.push(`Status: ${project.status}`)

  const projectUrl = getStudentProjectPublicUrl(project)
  if (projectUrl) lines.push(`Project URL: ${projectUrl}`)

  lines.push('', '— Handiz Team')

  return lines.join('\n')
}
