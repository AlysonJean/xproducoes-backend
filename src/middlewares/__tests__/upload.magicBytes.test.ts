import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockUploadFile = jest.fn();
jest.mock('../../services/uploadService', () => ({
  UploadService: jest.fn().mockImplementation(() => ({
    uploadFile: mockUploadFile,
    getCloudinaryMulterConfig: () => ({
      single: () => (req: any, _res: any, next: any) => next(),
      array: () => (req: any, _res: any, next: any) => next(),
    }),
  })),
}));

import { processUpload } from '../upload';

function buildReq(file: Partial<Express.Multer.File>) {
  return { file, body: {} } as any;
}

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('processUpload - rejeita conteúdo cujo binário não bate com o mimetype declarado', () => {
  beforeEach(() => {
    mockUploadFile.mockReset();
  });

  it('rejeita (400) um arquivo HTML disfarçado de image/jpeg, sem chamar uploadService.uploadFile', async () => {
    const req = buildReq({
      buffer: Buffer.from('<html><script>alert(1)</script></html>'),
      mimetype: 'image/jpeg',
      originalname: 'foto.jpg',
    });
    const res = buildRes();
    const next = jest.fn();

    await processUpload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('aceita um JPEG real e segue para o upload (chama next)', async () => {
    mockUploadFile.mockResolvedValue('https://res.cloudinary.com/fake/image.jpg');

    const req = buildReq({
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      mimetype: 'image/jpeg',
      originalname: 'foto.jpg',
    });
    const res = buildRes();
    const next = jest.fn();

    await processUpload(req, res, next);

    expect(mockUploadFile).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});
