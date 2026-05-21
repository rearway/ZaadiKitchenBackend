import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'

export interface JwtPayload {
  sub: string
  role: string
  phone?: string
  email?: string
  iat?: number
  exp?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
    })
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      role: payload.role,
      phone: payload.phone,
      email: payload.email,
    }
  }
}
