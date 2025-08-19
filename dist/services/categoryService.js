"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.update = update;
exports.findAll = findAll;
exports.deleteCategory = deleteCategory;
exports.countEquipments = countEquipments;
exports.findById = findById;
exports.findAllWithEquipmentCount = findAllWithEquipmentCount;
exports.findFeatured = findFeatured;
const categoryRepository_1 = require("../repositories/categoryRepository");
const repo = new categoryRepository_1.CategoryRepository();
async function create(data) {
    // Slug automático
    const slug = data.name.toLowerCase().replace(/\s+/g, "-");
    return repo.create({ name: data.name, slug });
}
async function update(id, data) {
    return repo.update(id, data);
}
async function findAll() {
    return repo.findAll();
}
async function deleteCategory(id) {
    // Verifica se há equipamentos vinculados à categoria
    const equipmentCount = await repo.countEquipments(id);
    if (equipmentCount > 0) {
        const error = new Error("Não é possível excluir a categoria pois existem equipamentos vinculados a ela.");
        error.status = 400;
        throw error;
    }
    return repo.delete(id);
}
async function countEquipments(id) {
    return repo.countEquipments(id);
}
async function findById(id) {
    return repo.findById(id);
}
async function findAllWithEquipmentCount() {
    return repo.findAllWithEquipmentCount();
}
async function findFeatured() {
    return repo.findFeatured();
}
