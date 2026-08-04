import { createPortal } from 'react-dom'
import { ToastContainer } from 'react-toastify'

const AppToastContainer = () =>
  createPortal(<ToastContainer theme="colored" position="top-right" autoClose={3000} style={{ zIndex: 19999 }} />, document.body)

export default AppToastContainer
