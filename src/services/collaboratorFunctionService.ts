import { CollaboratorFunctionRepository } from "../repositories/collaboratorFunctionRepository";

const repo = new CollaboratorFunctionRepository();

export class CollaboratorFunctionService {
  async getAll() {
    return repo.findAll();
  }

  async getById(id: string) {
    return repo.findById(id);
  }

  async create(data: { name: string; description?: string }) {
    return repo.create(data);
  }

  async update(id: string, data: { name?: string; description?: string; active?: boolean }) {
    return repo.update(id, data);
  }

  async delete(id: string) {
    return repo.delete(id);
  }
}
