import { Injectable, Logger as NestLogger } from '@nestjs/common'
import { Logger } from '../../core/entitygateway/Logger'

@Injectable()
export class LoggerService implements Logger {
  private readonly nestLogger = new NestLogger('ZaadiKitchen')

  log(message: string, ...args: any[]): void {
    this.nestLogger.log(message, ...args)
  }

  error(message: string, ...args: any[]): void {
    this.nestLogger.error(message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    this.nestLogger.warn(message, ...args)
  }

  debug(message: string, ...args: any[]): void {
    this.nestLogger.debug(message, ...args)
  }
}
