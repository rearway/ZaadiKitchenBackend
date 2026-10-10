import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'

function extractApiKey(headers: Record<string, string | string[] | undefined>): string | undefined {
  const auth = headers['authorization']
  if (typeof auth === 'string') {
    const match = /^ApiKey\s+(.+)$/i.exec(auth.trim())
    if (match) return match[1].trim()
  }
  const xKey = headers['x-api-key']
  if (typeof xKey === 'string' && xKey.trim()) return xKey.trim()
  return undefined
}

@Injectable()
export class ErpApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ERP_API_KEY?.trim()
    if (!expected) {
      throw new UnauthorizedException('ERP integration is not configured')
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>()
    const provided = extractApiKey(request.headers)

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid API key')
    }
    return true
  }
}
