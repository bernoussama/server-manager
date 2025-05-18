import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { items } from '../models/item';
import { Item } from '@server-manager/shared';

export const getItems = (req: Request, res: Response): void => {
  res.json(Array.from(items.values()));
};

export const getItem = (req: Request, res: Response): void => {
  const item = items.get(req.params.id);
  if (!item) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }
  res.json(item);
};

export const createItem = (req: Request, res: Response): void => {
  const { name, description } = req.body;

  const newItem: Item = {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  items.set(newItem.id, newItem);
  res.status(201).json(newItem);
};

export const updateItem = (req: Request, res: Response): void => {
  const { id } = req.params;
  const item = items.get(id);

  if (!item) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }

  const updatedItem: Item = {
    ...item,
    ...req.body,
    id,
    updatedAt: new Date(),
  };

  items.set(id, updatedItem);
  res.json(updatedItem);
};

export const deleteItem = (req: Request, res: Response): void => {
  const { id } = req.params;
  if (!items.has(id)) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }

  items.delete(id);
  res.status(204).send();
};
