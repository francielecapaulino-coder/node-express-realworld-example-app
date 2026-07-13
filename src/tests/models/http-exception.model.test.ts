import HttpException from '../../app/models/http-exception.model';

describe('HttpException', () => {
  test('exposes errorCode and the structured payload as message', () => {
    const payload = { errors: { email: ['is invalid'] } };
    const error = new HttpException(422, payload);

    expect(error.errorCode).toBe(422);
    expect(error.message).toBe(payload);
  });

  test('sets name to HttpException instead of the default Error', () => {
    const error = new HttpException(404, { errors: { article: ['not found'] } });

    expect(error.name).toBe('HttpException');
  });

  test('is a real Error instance with a readable stack header', () => {
    const error = new HttpException(400, { errors: { field: ['bad'] } });

    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toContain('HttpException:');
  });
});
