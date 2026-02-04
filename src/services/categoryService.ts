import { CategoryRepository } from "../repositories/categoryRepository";
import { createAppError } from "../types/common";

const repo = new CategoryRepository();

export async function create(data: { name: string; imageUrl?: string; imageAlt?: string }) {
  // Slug automático
  const slug = data.name.toLowerCase().replace(/\s+/g, "-");
  return repo.create({ 
    name: data.name, 
    slug,
    imageUrl: data.imageUrl,
    imageAlt: data.imageAlt || data.name
  });
}

export async function update(id: string, data: { name: string; imageUrl?: string; imageAlt?: string }) {
  return repo.update(id, data);
}

export async function findAll() {
  return repo.findAll();
}

export async function deleteCategory(id: string) {
  // Verifica se há equipamentos vinculados à categoria
  const equipmentCount = await repo.countEquipments(id);
  if (equipmentCount > 0) {
    throw createAppError("Não é possível excluir a categoria pois existem equipamentos vinculados a ela.", 400);
  }
  return repo.delete(id);
}

export async function countEquipments(id: string) {
  return repo.countEquipments(id);
}

export async function findById(id: string) {
  return repo.findById(id);
}

export async function findAllWithEquipmentCount() {
  return repo.findAllWithEquipmentCount();
}

export async function findFeatured() {
  return repo.findFeatured();
}
