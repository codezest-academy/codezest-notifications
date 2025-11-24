import request from 'supertest';
import app from '../../src/app';
import { notificationQueue } from '../../src/infrastructure/queue/notification.queue';

// Mock the queue to avoid needing Redis for this test
jest.mock('../../src/infrastructure/queue/notification.queue', () => ({
  notificationQueue: {
    add: jest.fn(),
    on: jest.fn(),
  },
}));

jest.mock('../../src/common/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('POST /notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 201 and queue a notification', async () => {
    const payload = {
      userId: 'user-123',
      type: 'EMAIL',
      title: 'Integration Test',
      message: 'Hello World',
      priority: 'HIGH',
    };

    const response = await request(app).post('/notifications').send(payload).expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.userId).toBe(payload.userId);
    expect(notificationQueue.add).toHaveBeenCalled();
  });

  it('should return 400 if fields are missing', async () => {
    const payload = {
      userId: 'user-123',
      // Missing type, title, message
    };

    await request(app).post('/notifications').send(payload).expect(400);
  });
});
