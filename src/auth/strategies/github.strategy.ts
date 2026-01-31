import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GitHubProfile {
  id: string;
  displayName?: string;
  username: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  _json: {
    name?: string;
  };
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  validate(
    accessToken: string,
    _refreshToken: string,
    profile: GitHubProfile,
  ): any {
    const { id, username, displayName, emails, photos, _json } = profile;

    // GitHub might not return the email if it's private, but scope 'user:email' helps
    const email =
      emails && emails.length > 0 ? emails[0].value : `${username}@github.com`;
    const fullName = displayName || _json.name || username;
    const [firstName, ...lastNameParts] = fullName.split(' ');

    return {
      githubId: id,
      email,
      firstName,
      lastName: lastNameParts.join(' ') || '',
      picture: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
    };
  }
}
