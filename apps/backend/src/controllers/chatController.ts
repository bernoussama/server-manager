import type { Request, Response } from 'express';
import { streamText } from 'ai';
import { openai } from '../lib/openai';
import { tools } from '../lib/toolRegistry';
import logger from '../lib/logger';

class ChatController {
  async handleChat(req: Request, res: Response) {
    const { messages } = req.body;

    try {
      const result = await streamText({
        model: openai('gpt-4o'),
        messages,
        tools,
        toolChoice: 'auto',
      });

      return result.toAIStreamResponse(res);
    } catch (error) {
      logger.error('Error handling chat request:', error);
      res.status(500).json({ message: 'Failed to handle chat request' });
    }
  }
}

export default new ChatController();
