import {
  DeliveryArea,
  Building,
  OutOfZoneInterest,
  DeliveryLocation,
} from '../entities/index.js'

export interface DeliveryAreaLoader {
  getActiveAreas(): Promise<DeliveryArea[]>
  getAllAreas(status?: string): Promise<DeliveryArea[]>
  searchActiveAreas(query: string): Promise<DeliveryArea[]>
  getAreaById(areaId: string): Promise<DeliveryArea | null>
  getAreaByName(name: string, excludeId?: string): Promise<DeliveryArea | null>
}

export interface DeliveryAreaPersistor {
  createDeliveryArea(request: Partial<DeliveryArea>): Promise<DeliveryArea>
  updateDeliveryArea(
    id: string,
    data: Partial<DeliveryArea>
  ): Promise<DeliveryArea>
}

export interface BuildingLoader {
  getBuildingsByArea(areaId: string): Promise<Building[]>
  searchBuildingsByArea(areaId: string, query: string): Promise<Building[]>
  getBuildingById(buildingId: string): Promise<Building | null>
}

export interface BuildingPersistor {
  createBuilding(request: Partial<Building>): Promise<Building>
  updateBuilding(id: string, data: { name: string }): Promise<Building>
  deleteBuilding(id: string): Promise<void>
}

export interface OutOfZoneInterestPersistor {
  createInterest(userId: string, areaName: string): Promise<OutOfZoneInterest>
  getUserInterestCount(userId: string): Promise<number>
}

export interface AggregatedOutOfZoneRequest {
  area_name: string
  request_count: number
  first_requested: string
  last_requested: string
}

export interface OutOfZoneInterestLoader {
  getAggregatedRequests(
    page: number,
    perPage: number
  ): Promise<{
    areas: AggregatedOutOfZoneRequest[]
    total: number
    totalRequests: number
  }>
}

export interface DeliveryLocationPersistor {
  createLocation(request: Partial<DeliveryLocation>): Promise<DeliveryLocation>
  updateLocation(
    id: string,
    data: Partial<DeliveryLocation>
  ): Promise<DeliveryLocation>
  deleteLocation(id: string): Promise<void>
  setPrimaryLocation(id: string, userId: string): Promise<void>
}

export interface DeliveryLocationLoader {
  getPrimaryLocationByUserId(userId: string): Promise<DeliveryLocation | null>
  getLocationsByUserId(userId: string): Promise<DeliveryLocation[]>
  getLocationById(id: string): Promise<DeliveryLocation | null>
}
