import { atom } from 'jotai'

// function to safely initialize the atom from localStorage
const loadUserFromLocalStorage = () => {
  try {
    const storedUser = localStorage.getItem('user-app')
    return storedUser ? JSON.parse(storedUser) : null
  } catch (error) {
    console.error('Error loading user from localStorage:', error)
    return null
  }
}

// atom for the user state
const userAtom = atom(loadUserFromLocalStorage())

// putting data into localStorage when the state changes
userAtom.onSet = (newValue) => {
  if (newValue) {
    try {
      localStorage.setItem('user-app', JSON.stringify(newValue))
    } catch (error) {
      console.error('Error saving user to localStorage:', error)
    }
  } else {
    localStorage.removeItem('user-app')
  }
}

export default userAtom
