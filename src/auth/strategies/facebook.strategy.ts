import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FacebookProfile {
  id: string;
  name?: {
    givenName: string;
    familyName: string;
  };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  _json: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('FACEBOOK_CLIENT_ID') || 'unconfigured',
      clientSecret:
        configService.get<string>('FACEBOOK_CLIENT_SECRET') || 'unconfigured',
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'photos'],
    });
  }

  validate(
    accessToken: string,
    _refreshToken: string,
    profile: FacebookProfile,
  ): any {
    const { id, name, emails, photos, _json } = profile;

    const email = emails && emails.length > 0 ? emails[0].value : _json.email;
    const firstName = name?.givenName || _json.first_name || '';
    const lastName = name?.familyName || _json.last_name || '';

    return {
      facebookId: id,
      email,
      firstName,
      lastName,
      picture: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
    };
  }
}
