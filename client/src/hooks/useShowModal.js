import { useCallback } from 'react'
import { Modal } from 'antd'

function useShowModal() {
  return useCallback(
    (title = 'Notification', content = 'This is a notification message', type = 'success', footer = null, duration = 2500, persistent = false) => {
      const modal = Modal[type]({
        title,
        content,
        footer,
        okButtonProps: { style: { display: 'none' } }, // Hide default OK button
        cancelButtonProps: { style: { display: 'none' } }, // Hide default Cancel button
      })

      if (!persistent && duration !== null) {
        setTimeout(() => modal.destroy(), duration) // Close modal after specified duration
      }

      return modal // Return modal to be controlled later if needed
    },
    [],
  )
}

export default useShowModal
