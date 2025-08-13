import request from 'supertest';
import app from '../../app';
import { streamText } from 'ai';
import type { Request, Response, NextFunction } from 'express';

jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

jest.mock('../../middlewares/authMiddleware', () => ({
  authMiddleware: (req: Request, res: Response, next: NextFunction) => next(),
}));

describe('ChatController', () => {
  it('should call streamText with the correct parameters', async () => {
    const mockMessages = [{ role: 'user', content: 'Hello' }];
    (streamText as jest.Mock).mockResolvedValue({
      toAIStreamResponse: (res: Response) => {
        return res.status(200).json({ message: 'mocked response' });
      },
    });

    const response = await request(app)
      .post('/api/chat')
      .send({ messages: mockMessages });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'mocked response' });
    expect(streamText).toHaveBeenCalledWith(expect.objectContaining({
      messages: mockMessages,
    }));
  });
});
