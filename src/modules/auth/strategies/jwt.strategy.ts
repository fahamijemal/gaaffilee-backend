import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { RedisService } from '../../../redis/redis.service';
import { JWT_DENYLIST_PREFIX } from '../../../config/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    try {
      const revoked = await this.redis.get(`${JWT_DENYLIST_PREFIX}${payload.jti}`);
      if (revoked) {
        throw new UnauthorizedException({ error_code: 'TOKEN_REVOKED', message: 'This token has been revoked.' });
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // Redis unreachable — fail secure
      throw new ServiceUnavailableException({ error_code: 'CACHE_UNAVAILABLE', message: 'Authentication service temporarily unavailable.' });
    }
  }
}
