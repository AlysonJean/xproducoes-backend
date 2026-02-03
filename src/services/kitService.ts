import { KitRepository } from "../repositories/kitRepository";

const repo = new KitRepository();

export async function create(data: any, _file?: Express.Multer.File) {
  const kitData = { ...data };
  // imageUrl deve vir do middleware do Cloudinary
  if (data.imageUrl) {
    kitData.imageUrl = data.imageUrl;
  }
  
  // Relacionamento com equipamentos
  if (Array.isArray(data.equipmentIds)) {
    kitData.equipments = {
      connect: data.equipmentIds.map((id: string) => ({ id })),
    };
    delete kitData.equipmentIds;
  }

  // Remove campos que não existem no schema do Prisma
  delete kitData.fileName;

  return repo.create(kitData);
}

export async function update(
  id: string,
  data: any,
  _file?: Express.Multer.File,
) {
  const kitData = { ...data };
  // imageUrl deve vir do middleware do Cloudinary
  if (data.imageUrl) {
    kitData.imageUrl = data.imageUrl;
  }
  
  if (Array.isArray(data.equipmentIds)) {
    kitData.equipments = {
      set: data.equipmentIds.map((id: string) => ({ id })),
    };
    delete kitData.equipmentIds;
  }

  // Remove campos que não existem no schema do Prisma
  delete kitData.fileName;

  return repo.update(id, kitData);
}

export async function findAll(limit?: number) {
  return repo.findAll(limit);
}

export async function findOne(id: string) {
  return repo.findOne(id);
}

export async function deleteKit(id: string) {
  return repo.delete(id);
}

export async function findRecommended() {
  return repo.findRecommended();
}

export async function findPopular() {
  return repo.findPopular();
}
