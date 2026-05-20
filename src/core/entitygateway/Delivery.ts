import { DeliveryArea, Building, OutOfZoneInterest, DeliveryLocation } from '../entities/index.js'

export interface DeliveryAreaLoader {
    getActiveAreas(): Promise<DeliveryArea[]>
    searchActiveAreas(query: string): Promise<DeliveryArea[]>
    getAreaById(areaId: string): Promise<DeliveryArea | null>
}

export interface DeliveryAreaPersistor {
    createDeliveryArea(request: Partial<DeliveryArea>): Promise<DeliveryArea>
}

export interface BuildingLoader {
    getBuildingsByArea(areaId: string): Promise<Building[]>
    searchBuildingsByArea(areaId: string, query: string): Promise<Building[]>
}

export interface OutOfZoneInterestPersistor {
    createInterest(userId: string, areaName: string): Promise<OutOfZoneInterest>
    getUserInterestCount(userId: string): Promise<number>
}

export interface DeliveryLocationPersistor {
    createLocation(request: Partial<DeliveryLocation>): Promise<DeliveryLocation>
}
