export interface Item {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage
export const items: Map<string, Item> = new Map();
