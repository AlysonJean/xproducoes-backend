import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

// Garante que o .env foi carregado antes de ler variáveis
dotenv.config();

const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

if (!cloudName || !apiKey || !apiSecret) {
  console.warn('[Cloudinary] Variáveis de ambiente ausentes. Verifique CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;
