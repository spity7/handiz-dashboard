import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'
import { useAtom } from 'jotai'
import userAtom from '@/atoms/userAtom'
import useShowModal from '@/hooks/useShowModal'

axios.defaults.withCredentials = true
const BASE_URL = 'https://api.vertex-engineering.co/api/v1/'
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

export function AuthProvider({ children }) {
  const showModal = useShowModal()
  const [, setUser] = useAtom(userAtom)

  const handleSignup = async (firstname, lastname, username, email, password, role) => {
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showModal('Error', 'Please enter a valid email address.', 'error')
      return // Don't proceed with signup if email is invalid
    }

    try {
      const res = await axios.post(`${BASE_URL}signup`, {
        firstname,
        lastname,
        username,
        email,
        password,
        role,
      })

      // log full response for debugging
      console.log('signup response:', res.status, res.data)

      const data = await res.data

      if (res.status < 200 || res.status >= 300) {
        // show backend message if available
        showModal('Error', data?.error || data?.message || `Signup failed (status ${res.status})`, 'error')
        return
      }

      if (data?.error) {
        showModal('Error', data.error, 'error')
        return
      }

      // Store a message or status in localStorage to show to the user
      localStorage.setItem(
        'signup-status',
        JSON.stringify({
          message: 'Signup successful! Please check your email to verify your account.',
        }),
      )

      window.location.href = '/auth/verify-email'
    } catch (error) {
      // print full error (network / CORS / server) for debugging
      console.error('Signup error:', error)

      const backendMessage = error?.response?.data?.error || error?.response?.data?.message || error?.response?.data || null

      if (backendMessage) {
        showModal('Error', backendMessage, 'error')
      } else {
        // network or unexpected error
        showModal('Error', error.message || 'An error occurred. Please try again.', 'error')
      }
    }
  }

  const handleLogin = async (emailOrUsername, password) => {
    try {
      const res = await axios.post(`${BASE_URL}login`, {
        emailOrUsername,
        password,
      })

      const data = res.data
      console.log('data', data)
      if (res.status === 200) {
        // check if user is verified
        if (!data.isVerified) {
          showModal('Error', 'Please verify your email before logging in.', 'error')
          return
        }
        // check if there is signup-status in localstorage and clear
        if (localStorage.getItem('signup-status')) {
          localStorage.removeItem('signup-status')
        }
        const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        localStorage.setItem('user-app', JSON.stringify({ ...data, expiry }))

        setUser(data)
      } else {
        showModal('Error', data.error || 'Unknown error occurred', 'error')
      }

      window.location.href = '/'
    } catch (error) {
      // Netzwerkfehler oder andere Fehler
      if (error.response) {
        const status = error.response.status
        if (status === 401) {
          showModal('Error', 'Unauthorized. Please log in again.', 'error')
        } else if (status === 400) {
          showModal('Error', error.response.data.error, 'error')
        } else {
          showModal('Error', `HTTP Error ${status}`, 'error')
        }
      } else if (error.request) {
        showModal('Error', 'No response from server', 'error')
      } else {
        showModal('Error', 'An error occurred. Please try again.', 'error')
      }
      console.error('Login error:', error.message)
    }
  }

  const handleLogout = async () => {
    try {
      // Attempt server logout; don't block client-side cleanup on failure
      await axios.post(`${BASE_URL}logout`).catch((err) => {
        console.warn('Logout request failed (continuing local cleanup):', err?.message || err)
      })
    } catch (err) {
      console.warn('Unexpected error during logout request:', err)
    } finally {
      // Always clear local session state
      localStorage.removeItem('user-app')
      // write a small key so other tabs can detect logout via storage event
      try {
        localStorage.setItem('logout-event', Date.now().toString())
      } catch (e) {
        // ignore quota errors
      }
      // dispatch a window event for same-tab listeners
      try {
        window.dispatchEvent(new Event('logout'))
      } catch (e) {
        // ignore
      }
      setUser(null)
      // redirect to home or sign-in page
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider
      value={{
        handleSignup,
        handleLogin,
        handleLogout,
        user: getStoredUser(),
        isAuthenticated: !!getStoredUser(),
      }}>
      {children}
    </AuthContext.Provider>
  )
}
