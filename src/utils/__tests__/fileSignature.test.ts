import { describe, expect, it } from '@jest/globals';
import { contentMatchesMimetype } from '../fileSignature';

describe('contentMatchesMimetype - validação de magic bytes contra o mimetype declarado', () => {
  const realJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const realPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const fakeContent = Buffer.from('<html><body><script>alert(1)</script></body></html>');

  it('aceita um JPEG real declarado como image/jpeg', () => {
    expect(contentMatchesMimetype(realJpeg, 'image/jpeg', 'foto.jpg')).toBe(true);
  });

  it('rejeita conteúdo HTML/script disfarçado de image/jpeg (o ataque que o mimetype sozinho não pega)', () => {
    expect(contentMatchesMimetype(fakeContent, 'image/jpeg', 'foto.jpg')).toBe(false);
  });

  it('rejeita um PNG real declarado como image/jpeg (mimetype não bate com o conteúdo real)', () => {
    expect(contentMatchesMimetype(realPng, 'image/jpeg', 'foto.jpg')).toBe(false);
  });

  it('aceita um PNG real declarado como image/png', () => {
    expect(contentMatchesMimetype(realPng, 'image/png', 'foto.png')).toBe(true);
  });

  it('rejeita conteúdo não-SVG disfarçado de image/svg+xml', () => {
    expect(contentMatchesMimetype(fakeContent, 'image/svg+xml', 'logo.svg')).toBe(false);
  });

  it('aceita um SVG real declarado como image/svg+xml', () => {
    const realSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>');
    expect(contentMatchesMimetype(realSvg, 'image/svg+xml', 'logo.svg')).toBe(true);
  });

  it('não bloqueia mimetypes fora da lista coberta (evita falso-positivo em formatos não reconhecidos)', () => {
    expect(contentMatchesMimetype(fakeContent, 'application/pdf', 'doc.pdf')).toBe(true);
  });
});
