import { User } from '../entities'
import { UserRole } from '../../codecs/enums'

export interface UserLoader {
  getUserById(userId: string): Promise<User | null>
  getUserByPhone(phone: string): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
}

export interface CreateUserRequest {
  phone?: string
  email?: string
  password?: string
  fullName: string
  role: UserRole
  languagePreference?: 'EN' | 'AR'
}

export interface UpdateUserRequest {
  fullName?: string
  email?: string
  languagePreference?: 'EN' | 'AR'
  pushNotificationToken?: string
  isActive?: boolean
}

export interface UserPersistor {
  createUser(request: CreateUserRequest): Promise<User>
  updateUser(userId: string, updates: UpdateUserRequest): Promise<User>
  deleteUser(userId: string): Promise<void>
}
