import { UserRole } from '../../codecs/enums'

export interface User {
  id: string
  phone?: string
  email?: string
  password?: string
  fullName: string
  role: UserRole
  languagePreference: 'EN' | 'AR'
  pushNotificationToken?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type UserWithoutPassword = Omit<User, 'password'>
