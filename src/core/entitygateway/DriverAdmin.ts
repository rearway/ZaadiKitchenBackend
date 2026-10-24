export interface AssignedArea {
  id: string
  name: string
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
}

export interface DriverAdminPersistor {
  createDriver(request: CreateDriverRecord): Promise<DriverSummary>
  updateDriver(
    driverId: string,
    updates: UpdateDriverRecord
  ): Promise<DriverSummary>
  softDeleteDriver(driverId: string): Promise<Date>
}
