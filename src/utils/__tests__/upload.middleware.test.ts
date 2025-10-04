const { uploadSingle, uploadMultiple, uploadAvatar } = require('../../middlewares/upload');
const multer = require('multer');

describe('uploadSingle', () => {
  it('deve retornar um middleware que chama next em sucesso', () => {
    const mockMulter = jest.fn(() => (req, res, cb) => cb());
    const uploadService = require('../../services/uploadService');
    jest.spyOn(uploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ single: () => mockMulter() });
    const middleware = uploadSingle('image');
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    uploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });

  it('deve retornar erro de tamanho de arquivo', () => {
    const mockMulter = jest.fn(() => (req, res, cb) => cb(Object.assign(new multer.MulterError('LIMIT_FILE_SIZE'), { message: 'Arquivo muito grande.' })));
    const uploadService = require('../../services/uploadService');
    jest.spyOn(uploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ single: () => mockMulter() });
    const middleware = uploadSingle('image');
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Arquivo muito grande. Máximo: 5MB.' });
    uploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });

  it('deve retornar erro de tipo de arquivo', () => {
    const mockMulter = jest.fn(() => (req, res, cb) => cb({ message: 'Tipo de arquivo não permitido.' }));
    const uploadService = require('../../services/uploadService');
    jest.spyOn(uploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ single: () => mockMulter() });
    const middleware = uploadSingle('image');
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Tipo de arquivo não permitido.' });
    uploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });
});

describe('uploadMultiple', () => {
  it('deve retornar um middleware array do multer', () => {
    const mockArray = jest.fn();
    const uploadService = require('../../services/uploadService');
    jest.spyOn(uploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ array: mockArray });
    const middleware = uploadMultiple('images', 3);
    expect(middleware).toBe(mockArray);
    uploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });
});

describe('uploadAvatar', () => {
  it('deve ser um middleware definido', () => {
    expect(typeof uploadAvatar).toBe('function');
  });
});
