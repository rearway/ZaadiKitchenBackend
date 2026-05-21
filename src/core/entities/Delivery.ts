export interface DeliveryArea {
  id: string
  name: string
  description?: string
  status: 'active' | 'coming_soon' | 'paused'
  createdAt: Date
  updatedAt: Date
}

export interface Building {
  id: string
  areaId: string
  name: string
  floorsCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface OutOfZoneInterest {
  id: string
  userId: string
  areaName: string
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryLocation {
  id: string
  userId: string
  areaId: string
  buildingId?: string
  buildingName: string
  floor?: string
  deskArea?: string
  deliveryPreference: 'hand_to_me' | 'reception'
  riderNotes?: string
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}
