import { ArgumentsHost, BadRequestException, HttpException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('ApiExceptionFilter', () => {
  it('memformat HttpException dengan message string', () => {
    const filter = new ApiExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new BadRequestException('Release version already exists'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: 'Release version already exists',
      error: 'Bad Request',
    });
  });

  it('menggabungkan array message dari ValidationPipe menjadi satu string', () => {
    const filter = new ApiExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(
      new HttpException(
        {
          statusCode: 400,
          message: ['version must be a string', 'version should not be empty'],
          error: 'Bad Request',
        },
        400,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: 'version must be a string, version should not be empty',
      error: 'Bad Request',
    });
  });

  it('memakai body string HttpException sebagai message', () => {
    const filter = new ApiExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new HttpException('Upload session not found', 404), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 404,
      message: 'Upload session not found',
      error: undefined,
    });
  });

  it('menyembunyikan detail error tak dikenal dan mengembalikan 500', () => {
    const filter = new ApiExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new Error('ECONNREFUSED db secret-detail'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    const payload = json.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(payload)).not.toContain('ECONNREFUSED');
  });
});
