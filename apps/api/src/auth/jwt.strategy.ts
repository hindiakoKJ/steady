import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

interface JwtPayload {
  sub: string
  householdId: string
  email: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'fallback-dev-secret',
    })
  }

  validate(payload: JwtPayload) {
    if (!payload.sub || !payload.householdId) {
      throw new UnauthorizedException()
    }
    return {
      userId: payload.sub,
      householdId: payload.householdId,
      email: payload.email,
    }
  }
}
