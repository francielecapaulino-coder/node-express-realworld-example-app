import { expressjwt as jwt } from 'express-jwt';
import * as express from 'express';
import { getJwtSecret } from './token.utils';

export const getTokenFromHeaders = (req: express.Request): string | undefined => {
  if (
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return undefined;
};

const auth = {
  required: jwt({
    secret: getJwtSecret(),
    getToken: getTokenFromHeaders,
    algorithms: ['HS256'],
  }),
  optional: jwt({
    secret: getJwtSecret(),
    credentialsRequired: false,
    getToken: getTokenFromHeaders,
    algorithms: ['HS256'],
  }),
};

export default auth;
