import { atom } from 'jotai'
import { AUTH_STATES } from './authStates'

const authScreenAtom = atom(AUTH_STATES.LOGIN)

export default authScreenAtom
