export enum UserRole {
    CUSTOMER = 'CUSTOMER',
    DRIVER = 'DRIVER',
    ADMIN = 'ADMIN',
    OPS = 'OPS',
}

export enum SubscriptionState {
    NEW = 'NEW',
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    EXPIRED = 'EXPIRED',
}

export enum PlanType {
    TRY_IT = 'TRY_IT',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
}

export enum DeliveryStatus {
    SCHEDULED = 'SCHEDULED',
    SKIPPED = 'SKIPPED',
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
    DELIVERED = 'DELIVERED',
    ISSUE = 'ISSUE',
}

export enum IssueCategory {
    DAMAGED = 'DAMAGED',
    MISSING = 'MISSING',
    WRONG = 'WRONG',
}
