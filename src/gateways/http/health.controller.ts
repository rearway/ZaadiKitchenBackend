import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('Health')
@Controller()
export class HealthController {
    @Get('/health')
    @ApiOperation({ summary: 'Health check — used by ALB target group' })
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        }
    }
}
