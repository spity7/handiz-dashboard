import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAtom } from 'jotai'
import userAtom from '@/atoms/userAtom'
import useShowModal from '@/hooks/useShowModal'

axios.defaults.withCredentials = true
const BASE_URL = 'https://api.handiz.org/api/v1/'
// const BASE_URL = 'http://localhost:5016/api/v1/'

const AuthContext = createContext(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

function getStoredUser() {
  const raw = localStorage.getItem('user-app')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem('user-app')
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem('user-app')
    return null
  }
}

function persistUser(data) {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = { ...data, expiry }
  localStorage.setItem('user-app', JSON.stringify(payload))
  return payload
}

export function AuthProvider({ children }) {
  const showModal = useShowModal()
  const [, setUserAtom] = useAtom(userAtom)
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem('user-app')
    setUser(null)
    setUserAtom(null)
  }, [setUserAtom])

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          clearSession()
          if (!window.location.pathname.startsWith('/auth/')) {
            window.location.href = '/auth/sign-in'
          }
        }
        return Promise.reject(error)
      },
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [clearSession])

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) {
      setLoading(false)
      return
    }
    axios
      .get(`${BASE_URL}me`)
      .then((res) => {
        const fresh = persistUser(res.data)
        setUser(fresh)
        setUserAtom(fresh)
      })
      .catch(() => {
        clearSession()
      })
      .finally(() => setLoading(false))
  }, [clearSession, setUserAtom])

  const handleSignup = async (firstname, lastname, username, email, password) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showModal('Error', 'Please enter a valid email address.', 'error')
      return
    }

    try {
      const res = await axios.post(`${BASE_URL}signup`, {
        firstname,
        lastname,
        username,
        email,
        password,
      })

      const data = res.data
      if (res.status < 200 || res.status >= 300 || data?.error) {
        showModal('Error', data?.error || data?.message || 'Signup failed', 'error')
        return
      }

      localStorage.setItem(
        'signup-status',
        JSON.stringify({
          message: 'Signup successful! Please check your email to verify your account.',
        }),
      )
      window.location.href = '/auth/verify-email'
    } catch (error) {
      const backendMessage = error?.response?.data?.error || error?.response?.data?.message || error.message
      showModal('Error', backendMessage || 'An error occurred. Please try again.', 'error')
    }
  }

  const handleLogin = async (emailOrUsername, password) => {
    try {
      const res = await axios.post(`${BASE_URL}login`, { emailOrUsername, password })
      const data = res.data

      if (!data.isVerified) {
        showModal('Error', 'Please verify your email before logging in.', 'error')
        return
      }

      if (localStorage.getItem('signup-status')) {
        localStorage.removeItem('signup-status')
      }

      const fresh = persistUser(data)
      setUser(fresh)
      setUserAtom(fresh)
      window.location.href = '/'
    } catch (error) {
      const msg = error?.response?.data?.error || error.message || 'Login failed'
      showModal('Error', msg, 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await confirmLogout()
    } catch {
      // user cancelled
      return
    }
    try {
      await axios.post(`${BASE_URL}logout`)
    } catch {
      // continue local cleanup
    } finally {
      clearSession()
      window.location.href = '/auth/sign-in'
    }
  }

  return (
    <AuthContext.Provider
      value={{
        handleSignup,
        handleLogin,
        handleLogout,
        user,
        isAuthenticated: !!user,
        loading,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

async function confirmLogout() {
  const Swal = (await import('sweetalert2')).default
  const result = await Swal.fire({
    title: 'Log out?',
    text: 'You will need to sign in again to access the dashboard.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Log out',
    cancelButtonText: 'Stay',
    reverseButtons: true,
  })
  if (!result.isConfirmed) throw new Error('cancelled')
}
