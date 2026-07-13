import * as bcrypt from 'bcryptjs';
import { RegisterInput } from './register-input.model';
import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import { RegisteredUser } from './registered-user.model';
import generateToken from './token.utils';

const MIN_PASSWORD_LENGTH = 8;

const validatePasswordLength = (password: string) => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpException(422, {
      errors: { password: [`is too short (minimum is ${MIN_PASSWORD_LENGTH} characters)`] },
    });
  }
};

// Single query (OR + NOT) instead of two sequential findUnique round-trips.
// excludeUserId lets updateUser check uniqueness against everyone EXCEPT the
// user being updated, so re-submitting your own current email/username isn't
// treated as a conflict. Both callers already guarantee at least one of
// email/username is truthy before calling this.
const checkUserUniqueness = async (email: string | undefined, username: string | undefined, excludeUserId?: number) => {
  const conflicts = await prisma.user.findMany({
    where: {
      OR: [...(email ? [{ email }] : []), ...(username ? [{ username }] : [])],
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { email: true, username: true },
  });

  const emailTaken = email ? conflicts.some((user) => user.email === email) : false;
  const usernameTaken = username ? conflicts.some((user) => user.username === username) : false;

  if (emailTaken || usernameTaken) {
    throw new HttpException(422, {
      errors: {
        ...(emailTaken ? { email: ['has already been taken'] } : {}),
        ...(usernameTaken ? { username: ['has already been taken'] } : {}),
      },
    });
  }
};

export const createUser = async (input: RegisterInput): Promise<RegisteredUser> => {
  const email = input.email?.trim();
  const username = input.username?.trim();
  const password = input.password?.trim();
  const { image, bio, demo } = input;

  if (!email) {
    throw new HttpException(422, { errors: { email: ["can't be blank"] } });
  }

  if (!username) {
    throw new HttpException(422, { errors: { username: ["can't be blank"] } });
  }

  if (!password) {
    throw new HttpException(422, { errors: { password: ["can't be blank"] } });
  }

  validatePasswordLength(password);

  await checkUserUniqueness(email, username);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      ...(image ? { image } : {}),
      ...(bio ? { bio } : {}),
      ...(demo ? { demo } : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      image: true,
    },
  });

  return {
    ...user,
    token: generateToken(user.id),
  };
};

export interface LoginInput {
  email?: string;
  password?: string;
}

// A bcrypt hash of an unguessable placeholder — never matches a real
// password, only exists to keep login()'s timing profile constant whether
// or not the email is registered.
const DUMMY_PASSWORD_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8G8k7C0vhO4gwPTHo6X5v8j4y8h3Bq';

export const login = async (userPayload: LoginInput) => {
  const email = userPayload.email?.trim();
  const password = userPayload.password?.trim();

  if (!email) {
    throw new HttpException(422, { errors: { email: ["can't be blank"] } });
  }

  if (!password) {
    throw new HttpException(422, { errors: { password: ["can't be blank"] } });
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      bio: true,
      image: true,
    },
  });

  // Always run bcrypt.compare, even for a nonexistent user, against a
  // fixed dummy hash — otherwise a nonexistent email returns near-instantly
  // while a wrong password takes ~100ms of bcrypt work, letting an attacker
  // infer which emails are registered purely from response timing.
  const match = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);

  if (user && match) {
    return {
      email: user.email,
      username: user.username,
      bio: user.bio,
      image: user.image,
      token: generateToken(user.id),
    };
  }

  throw new HttpException(403, {
    errors: {
      'email or password': ['is invalid'],
    },
  });
};

export const getCurrentUser = async (id: number, token: string): Promise<RegisteredUser> => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      image: true,
    },
  });

  if (!user) {
    throw new HttpException(401, { errors: { authorization: ['user no longer exists'] } });
  }

  return {
    ...user,
    token,
  };
};

export interface UpdateUserInput {
  email?: string;
  username?: string;
  password?: string;
  image?: string;
  bio?: string;
}

export const updateUser = async (userPayload: UpdateUserInput, id: number) => {
  const email = userPayload.email?.trim();
  const username = userPayload.username?.trim();
  const password = userPayload.password?.trim();
  const { image, bio } = userPayload;
  let hashedPassword;

  if (email || username) {
    await checkUserUniqueness(email, username, id);
  }

  if (password) {
    validatePasswordLength(password);
    hashedPassword = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      ...(email ? { email } : {}),
      ...(username ? { username } : {}),
      ...(password ? { password: hashedPassword } : {}),
      ...(image ? { image } : {}),
      ...(bio ? { bio } : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      image: true,
    },
  });

  return {
    ...user,
    token: generateToken(user.id),
  };
};
