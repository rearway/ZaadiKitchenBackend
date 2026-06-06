import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'

@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>()
    const secret = process.env.INTERNAL_JOB_SECRET
    const provided = request.headers['x-internal-secret']

    if (!secret || !provided || provided !== secret) {
      throw new UnauthorizedException('Invalid internal secret')
    }
    return true
  }
}
