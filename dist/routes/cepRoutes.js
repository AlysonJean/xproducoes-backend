"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_fetch_1 = __importDefault(require("node-fetch"));
const router = (0, express_1.Router)();
// Proxy para ViaCEP
router.get('/:cep', async (req, res) => {
    const { cep } = req.params;
    if (!cep || cep.length !== 8) {
        return res.status(400).json({ erro: true, message: 'CEP inválido' });
    }
    try {
        const viaCepUrl = `https://viacep.com.br/ws/${cep}/json/`;
        const response = await (0, node_fetch_1.default)(viaCepUrl);
        const data = await response.json();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ erro: true, message: 'Erro ao buscar CEP' });
    }
});
exports.default = router;
