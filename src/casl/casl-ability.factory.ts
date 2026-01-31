import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User, Role, SubscriptionPlan } from '@prisma/client';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Publish = 'publish',
  Generate = 'generate',
}

// Use strings for subjects to avoid prisma type/value conflict in this context
type Subjects = 'Post' | 'User' | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    if (user.role === Role.ADMIN) {
      can(Action.Manage, 'all');
    } else {
      can(Action.Read, 'all');

      // Post permissions
      can(Action.Create, 'Post');
      can(Action.Read, 'Post', { authorId: user.id } as any);
      can(Action.Update, 'Post', { authorId: user.id } as any);
      can(Action.Delete, 'Post', { authorId: user.id } as any);

      // Subscription based permissions
      if (user.subscriptionStatus === SubscriptionPlan.PREMIUM) {
        can(Action.Publish, 'Post');
        can(Action.Generate, 'all');
      } else {
        cannot(Action.Publish, 'Post');
      }
    }

    return build();
  }
}
