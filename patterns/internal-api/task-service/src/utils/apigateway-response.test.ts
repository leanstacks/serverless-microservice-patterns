import {
  createResponse,
  ok,
  created,
  noContent,
  badRequest,
  notFound,
  internalServerError,
} from './apigateway-response';

jest.mock('./config', () => ({
  config: {
    CORS_ALLOW_ORIGIN: 'https://example.com',
    TASKS_TABLE: 'mock-table',
  },
}));

describe('apigateway-response', () => {
  const corsOrigin = 'https://example.com';

  beforeEach(() => {
    // No setup needed for now, but placeholder for future cleanup/mocks
  });

  describe('createResponse', () => {
    it('should return a valid API Gateway response with correct status and body', () => {
      // Arrange
      const status = 200;
      const body = { foo: 'bar' };

      // Act
      const result = createResponse(status, body);

      // Assert
      expect(result).toEqual({
        statusCode: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
        },
        body: JSON.stringify(body),
      });
    });
  });

  describe('ok', () => {
    it('returns 200', () => {
      // Arrange
      const body = { hello: 'world' };

      // Act
      const result = ok(body);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(result.body).toBe(JSON.stringify(body));
    });
  });

  describe('created', () => {
    it('returns 201', () => {
      // Arrange
      const body = { id: 1 };

      // Act
      const result = created(body);

      // Assert
      expect(result.statusCode).toBe(201);
      expect(result.body).toBe(JSON.stringify(body));
    });
  });

  describe('noContent', () => {
    it('returns 204 with empty object', () => {
      // Act
      const result = noContent();

      // Assert
      expect(result.statusCode).toBe(204);
      expect(result.body).toBe(JSON.stringify({}));
    });
  });

  describe('badRequest', () => {
    it('returns 400 with default message', () => {
      // Act
      const result = badRequest();

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Bad Request' });
    });

    it('returns 400 with custom message', () => {
      // Arrange
      const message = 'Custom error';

      // Act
      const result = badRequest(message);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message });
    });
  });

  describe('notFound', () => {
    it('returns 404 with default message', () => {
      // Act
      const result = notFound();

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ message: 'Not Found' });
    });

    it('returns 404 with custom message', () => {
      // Arrange
      const message = 'Missing';

      // Act
      const result = notFound(message);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ message });
    });
  });

  describe('internalServerError', () => {
    it('returns 500 with default message', () => {
      // Act
      const result = internalServerError();

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({ message: 'Internal Server Error' });
    });

    it('returns 500 with custom message', () => {
      // Arrange
      const message = 'Oops';

      // Act
      const result = internalServerError(message);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({ message });
    });
  });
});
