"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.update = update;
exports.findAll = findAll;
exports.findOne = findOne;
exports.deleteKit = deleteKit;
exports.findRecommended = findRecommended;
exports.findPopular = findPopular;
const kitRepository_1 = require("../repositories/kitRepository");
const repo = new kitRepository_1.KitRepository();
async function create(data, file) {
    const kitData = { ...data };
    // imageUrl deve vir do middleware do Cloudinary
    if (data.imageUrl) {
        kitData.imageUrl = data.imageUrl;
    }
    // Relacionamento com equipamentos
    if (Array.isArray(data.equipmentIds)) {
        kitData.equipments = {
            connect: data.equipmentIds.map((id) => ({ id })),
        };
        delete kitData.equipmentIds;
    }
    return repo.create(kitData);
}
async function update(id, data, file) {
    const kitData = { ...data };
    // imageUrl deve vir do middleware do Cloudinary
    if (data.imageUrl) {
        kitData.imageUrl = data.imageUrl;
    }
    if (Array.isArray(data.equipmentIds)) {
        kitData.equipments = {
            set: data.equipmentIds.map((id) => ({ id })),
        };
        delete data.equipmentIds;
    }
    return repo.update(id, kitData);
}
async function findAll() {
    return repo.findAll();
}
async function findOne(id) {
    return repo.findOne(id);
}
async function deleteKit(id) {
    return repo.delete(id);
}
async function findRecommended() {
    return repo.findRecommended();
}
async function findPopular() {
    return repo.findPopular();
}
