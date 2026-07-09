/**
 * Validação de assinatura binária (magic bytes) de arquivos enviados por
 * upload. O `mimetype` reportado pelo multer vem do header Content-Type
 * enviado pelo cliente — totalmente forjável. Isso confirma que o conteúdo
 * real do arquivo corresponde ao que o mimetype alega ser, antes de aceitar
 * o upload (ex.: impede subir um .html/.php disfarçado de imagem).
 */

function matches(buffer: Buffer, offset: number, signature: number[]): boolean {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

function isJpeg(buffer: Buffer): boolean {
  return matches(buffer, 0, [0xff, 0xd8, 0xff]);
}

function isPng(buffer: Buffer): boolean {
  return matches(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isGif(buffer: Buffer): boolean {
  return matches(buffer, 0, [0x47, 0x49, 0x46, 0x38]); // GIF8 (7a ou 9a)
}

function isWebp(buffer: Buffer): boolean {
  return matches(buffer, 0, [0x52, 0x49, 0x46, 0x46]) // "RIFF"
    && matches(buffer, 8, [0x57, 0x45, 0x42, 0x50]); // "WEBP"
}

function isBmp(buffer: Buffer): boolean {
  return matches(buffer, 0, [0x42, 0x4d]);
}

function isSvg(buffer: Buffer): boolean {
  // SVG é texto, sem número mágico binário. Aceita se o início do conteúdo
  // (após espaços/BOM) parecer XML/SVG de fato.
  const head = buffer.subarray(0, 300).toString("utf8").replace(/^﻿/, "").trimStart().toLowerCase();
  return head.startsWith("<?xml") || head.startsWith("<svg");
}

function isMp4(buffer: Buffer): boolean {
  // Caixa "ftyp" aparece a partir do byte 4 em arquivos MP4/MOV/M4V.
  return matches(buffer, 4, [0x66, 0x74, 0x79, 0x70]); // "ftyp"
}

function isWebmOrMkv(buffer: Buffer): boolean {
  return matches(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3]);
}

function isAvi(buffer: Buffer): boolean {
  return matches(buffer, 0, [0x52, 0x49, 0x46, 0x46]) // "RIFF"
    && matches(buffer, 8, [0x41, 0x56, 0x49, 0x20]); // "AVI "
}

/**
 * Verifica se o conteúdo binário do arquivo é compatível com o mimetype
 * declarado. Retorna true quando reconhece o formato e ele bate; false
 * quando reconhece um mimetype de imagem/vídeo mas o conteúdo não confere.
 * Para mimetypes fora da lista coberta, retorna true (não bloqueia o que
 * ainda não sabemos verificar — evita falso-positivo em formatos raros).
 */
export function contentMatchesMimetype(buffer: Buffer, mimetype: string, originalname: string): boolean {
  const isSvgByName = originalname?.toLowerCase().endsWith(".svg");

  if (mimetype === "image/jpeg" || mimetype === "image/jpg") return isJpeg(buffer);
  if (mimetype === "image/png") return isPng(buffer);
  if (mimetype === "image/gif") return isGif(buffer);
  if (mimetype === "image/webp") return isWebp(buffer);
  if (mimetype === "image/bmp") return isBmp(buffer);
  if (
    mimetype === "image/svg+xml" ||
    mimetype === "text/xml" ||
    mimetype === "application/xml" ||
    isSvgByName
  ) {
    return isSvg(buffer);
  }

  if (mimetype === "video/mp4" || mimetype === "video/quicktime") return isMp4(buffer);
  if (mimetype === "video/webm") return isWebmOrMkv(buffer);
  if (mimetype === "video/x-msvideo") return isAvi(buffer);

  // Mimetype fora da lista coberta (ex.: outros codecs de vídeo) — não
  // bloqueia por falta de assinatura conhecida.
  return true;
}
