export interface NotificationGateway {
  notify(userId: string, message: string): Promise<void>
}
