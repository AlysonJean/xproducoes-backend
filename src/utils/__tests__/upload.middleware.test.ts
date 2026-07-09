const { uploadSingle, uploadMultiple, uploadAvatar } = require('../../middlewares/upload');
const multer = require('multer');
const { UploadService } = require('../../services/uploadService'); // Importar classe

describe('uploadSingle', () => {
  it('deve retornar um middleware que chama next em sucesso', () => {
    const mockMulter = jest.fn(() => (req, res, cb) => cb());
    
    // Spy no prototype da classe
    jest.spyOn(UploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ single: () => mockMulter() });
    
    const middleware = uploadSingle('image');
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    UploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });

  it('deve retornar erro de tamanho de arquivo', () => {
    const mockMulter = jest.fn(() => (req, res, cb) => cb(Object.assign(new multer.MulterError('LIMIT_FILE_SIZE'), { message: 'Arquivo muito grande.' })));
    
    jest.spyOn(UploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ single: () => mockMulter() });
    
    const middleware = uploadSingle('image');
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    // Alinhado ao limite real (50MB) configurado em uploadService.getCloudinaryMulterConfig.
    // A mensagem antiga dizia 5MB, o que não correspondia ao limite de fato aplicado.
    expect(res.json).toHaveBeenCalledWith({ error: 'Arquivo muito grande. Máximo: 50MB.' });
    UploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });

  it('deve retornar erro de tipo de arquivo', () => {
    const mockMulter = jest.fn(() => (req, res, cb) => cb({ message: 'Tipo de arquivo não permitido.' }));
    
    jest.spyOn(UploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ single: () => mockMulter() });
    
    const middleware = uploadSingle('image');
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Tipo de arquivo não permitido.' });
    UploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });
});

describe('uploadMultiple', () => {
  it('deve retornar um middleware array do multer', () => {
    const mockArray = jest.fn();

    jest.spyOn(UploadService.prototype, 'getCloudinaryMulterConfig').mockReturnValue({ array: () => mockArray });
    const middleware = uploadMultiple('images', 3);
    // Verificar se chamou o middleware mocked corretamente
    // Nota: O teste original comparava identity, mas como chamamos função, melhor verificar comportamento
    // Mas se o código original retorna o resultado de .array(), então deve ser o mockArray
    expect(middleware).toBe(mockArray); 
    UploadService.prototype.getCloudinaryMulterConfig.mockRestore();
  });
});

describe('uploadAvatar', () => {
  it('deve ser um middleware definido', () => {
    expect(typeof uploadAvatar).toBe('function');
  });
});
