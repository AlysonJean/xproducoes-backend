import { Request, Response } from 'express';
import { ServiceService } from '../services/serviceService';

const service = new ServiceService();

export class ServiceController {
  async list(req: Request, res: Response) {
    try {
      const publicView = req.userRole !== 'ADMIN';
      const services = await service.findAll(undefined, publicView);
      return res.json(services);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao buscar serviços' });
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceData = await service.findOne(String(id));
      if (!serviceData) return res.status(404).json({ message: 'Serviço não encontrado' });
      return res.json(serviceData);
    } catch {
      return res.status(500).json({ message: 'Erro ao buscar serviço' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = { ...req.body };
      // Ensure numeric types
      if (data.price) data.price = Number(data.price);
      if (data.duration) data.duration = Number(data.duration);
      
      const serviceData = await service.create(data);
      return res.status(201).json(serviceData);
    } catch (error) {
      console.error(error);
      return res.status(400).json({ message: 'Erro ao criar serviço' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      if (data.price) data.price = Number(data.price);
      if (data.duration) data.duration = Number(data.duration);

      const serviceData = await service.update(String(id), data);
      return res.json(serviceData);
    } catch {
      return res.status(400).json({ message: 'Erro ao atualizar serviço' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await service.delete(String(id));
      return res.status(204).send();
    } catch {
      return res.status(400).json({ message: 'Erro ao deletar serviço' });
    }
  }
}
