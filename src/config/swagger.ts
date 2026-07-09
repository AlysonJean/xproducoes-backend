/**
 * 📚 SWAGGER/OPENAPI CONFIGURATION
 * Documentação interativa da API
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response, NextFunction } from 'express';
import { openAPISchema } from '../docs/openapi.js';
import { isValidInternalKey } from '../utils/internalApiKey.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'X Produções e Eventos API',
      version: '1.0.0',
      description: `
# API de Aluguel de Equipamentos Audiovisuais

API RESTful para o sistema X Produções e Eventos.

## Autenticação

A API utiliza **JWT (JSON Web Token)** para autenticação. Após o login, você receberá:
- **Access Token**: Válido por 15 minutos
- **Refresh Token**: Válido por 7 dias

Os tokens são enviados automaticamente via **httpOnly cookies** para maior segurança.

## Rate Limiting

- **Global**: 100 requisições por 15 minutos
- **Login**: 5 tentativas por 15 minutos
- **Registro**: 3 tentativas por hora

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autorizado |
| 403 | Proibido |
| 404 | Não encontrado |
| 429 | Muitas requisições |
| 500 | Erro interno |
      `,
      contact: {
        name: 'Suporte X Produções',
        email: 'suporte@xproducoeseeventos.com.br',
        url: 'https://xproducoeseeventos.com.br',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.xproducoeseeventos.com.br/api/v1',
        description: 'Servidor de Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido no login',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'x_access_token',
          description: 'Token de acesso via cookie httpOnly',
        },
      },
      schemas: {
        // === AUTH ===
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'usuario@email.com' },
            password: { type: 'string', minLength: 6, example: 'senha123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', description: 'Access token JWT' },
            refreshToken: { type: 'string', description: 'Refresh token JWT' },
            redirectTo: { type: 'string', example: '/admin/dashboard' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'João Silva' },
            email: { type: 'string', format: 'email', example: 'joao@email.com' },
            password: { type: 'string', minLength: 6, example: 'senha123' },
            phone: { type: 'string', example: '(11) 99999-9999' },
          },
        },

        // === USER ===
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['ADMIN', 'COLLABORATOR', 'CLIENT'] },
            avatarUrl: { type: 'string', nullable: true },
            isVip: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // === EQUIPMENT ===
        Equipment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Mesa de Som 16 Canais' },
            description: { type: 'string' },
            dailyRate: { type: 'number', format: 'float', example: 150.00 },
            weeklyRate: { type: 'number', format: 'float', nullable: true },
            monthlyRate: { type: 'number', format: 'float', nullable: true },
            available: { type: 'boolean' },
            stock: { type: 'integer', minimum: 0 },
            imageUrl: { type: 'string', nullable: true },
            categoryId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        EquipmentCreate: {
          type: 'object',
          required: ['name', 'dailyRate', 'categoryId'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            dailyRate: { type: 'number' },
            weeklyRate: { type: 'number' },
            monthlyRate: { type: 'number' },
            stock: { type: 'integer', default: 1 },
            categoryId: { type: 'string', format: 'uuid' },
          },
        },

        // === CATEGORY ===
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Som' },
            slug: { type: 'string', example: 'som' },
            description: { type: 'string', nullable: true },
            imageUrl: { type: 'string', nullable: true },
            parentId: { type: 'string', format: 'uuid', nullable: true },
          },
        },

        // === BOOKING ===
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            totalPrice: { type: 'number', format: 'float' },
            userId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        BookingCreate: {
          type: 'object',
          required: ['startDate', 'endDate', 'items'],
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  equipmentId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
            notes: { type: 'string' },
          },
        },

        // === ERROR ===
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },

        // === PAGINATION ===
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Token de acesso ausente ou inválido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ForbiddenError: {
          description: 'Sem permissão para acessar este recurso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticação e autorização' },
      { name: 'Users', description: 'Gerenciamento de usuários' },
      { name: 'Equipment', description: 'Catálogo de equipamentos' },
      { name: 'Categories', description: 'Categorias de equipamentos' },
      { name: 'Bookings', description: 'Reservas e aluguéis' },
      { name: 'Cart', description: 'Carrinho de compras' },
      { name: 'Admin', description: 'Operações administrativas' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Em produção, a documentação revela rotas internas, DTOs e o esquema de
 * auth para qualquer visitante — exige a mesma X-Internal-Key usada pelos
 * endpoints /internal/*. Em dev/test continua aberta, como sempre foi.
 */
function guardInProduction(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  if (!isValidInternalKey(req)) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  return next();
}

/**
 * Configura Swagger UI no Express
 */
export function setupSwagger(app: Express): void {
  // Servir documentação Swagger com spec original (backward compatibility)
  app.use(
    '/api/docs',
    guardInProduction,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'X Produções API Docs',
      customfavIcon: '/favicon.ico',
    })
  );

  // Endpoint JSON da especificação OpenAPI (original)
  app.get('/api/docs.json', guardInProduction, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ✅ NEW: Servir documentação com OpenAPI 3.1 schema (2026 standard)
  app.use(
    '/api/docs/v2',
    guardInProduction,
    swaggerUi.serve,
    swaggerUi.setup(openAPISchema as any, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'X Produções API Docs (v2)',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        urls: [
          {
            url: '/api/v1/openapi.json',
            name: 'OpenAPI v3.1 (Current)',
          },
          {
            url: '/api/docs.json',
            name: 'Swagger v3.0 (Legacy)',
          },
        ],
      },
    })
  );

  // ✅ NEW: Expose OpenAPI schema as JSON endpoint
  app.get('/api/v1/openapi.json', guardInProduction, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openAPISchema);
  });
}

export { swaggerSpec };
