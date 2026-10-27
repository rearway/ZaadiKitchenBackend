export interface AssignedArea {
  id: string
  name: string
}

export interface UnassignedArea {
  id: string
  name: string
  status: 'active' | 'coming_soon' | 'paused'
}

export interface DriverSummary {
  id: string
  fullName: string
  phone: string | null
  isActive: boolean
  areas: AssignedArea[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateDriverRecord {
  fullName: string
  phone: string
  areaIds: string[]
}

export interface UpdateDriverRecord {
  fullName?: string
  phone?: string
  isActive?: boolean
  areaIds?: string[]
}

export interface DriverAdminLoader {
  listDrivers(): Promise<DriverSummary[]>
  getDriverById(driverId: string): Promise<DriverSummary | null>
  getAssignedAreaIds(driverId: string): Promise<string[]>
  listUnassignedAreas(): Promise<UnassignedArea[]>
}

export interface DriverAdminPersistor {
  createDriver(request: CreateDriverRecord): Promise<DriverSummary>
  updateDriver(
    driverId: string,
    updates: UpdateDriverRecord
  ): Promise<DriverSummary>
  assignArea(driverId: string, areaId: string): Promise<DriverSummary>
  softDeleteDriver(driverId: string): Promise<Date>
}
