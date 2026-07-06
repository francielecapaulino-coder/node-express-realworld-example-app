import * as jwt from 'jsonwebtoken';
import generateToken from '../../app/routes/auth/token.utils';

describe('generateToken', () => {
  test('signs a token containing only the user id, expiring in 60 days', () => {
    const token = generateToken(456);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecret') as jwt.JwtPayload;

    expect(decoded.user).toEqual({ id: 456 });
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'user']);

    const sixtyDaysInSeconds = 60 * 24 * 60 * 60;
    expect(decoded.exp! - decoded.iat!).toBe(sixtyDaysInSeconds);
  });
});
