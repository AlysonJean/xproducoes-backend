/**
 * OpenAPI 3.1 Schema - X-Produções API
 * Complete RESTful API Documentation
 * 
 * Version: 1.0.0
 * Generated: March 16, 2026
 */

export const openAPISchema = {
  openapi: '3.1.0',
  info: {
    title: 'X-Produções API',
    description: 'API de gestão de equipamentos audiovisuais com locação, reservas e colaboradores',
    version: '1.0.0',
    contact: {
      name: 'Support',
      email: 'support@xproducoes.com',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'https://api.xproducoes.com/api/v1',
      description: 'Production',
      variables: {
        basePath: {
          default: '/api/v1',
        },
      },
    },
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Development',
    },
  ],
  paths: {
    // ==================== AUTHENTICATION ====================
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new user',
        description: 'Create a new user account (CLIENT or COLLABORATOR role)',
        operationId: 'registerUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                    description: 'User email address',
                  },
                  password: {
                    type: 'string',
                    minLength: 8,
                    example: 'SecurePass123!',
                    description: 'Password (min 8 chars, uppercase, number, special char)',
                  },
                  name: {
                    type: 'string',
                    example: 'João Silva',
                    description: 'Full name',
                  },
                  phone: {
                    type: 'string',
                    example: '11987654321',
                    description: 'Phone number (11 digits)',
                  },
                  userType: {
                    type: 'string',
                    enum: ['CLIENT', 'COLLABORATOR'],
                    default: 'CLIENT',
                    description: 'User type for role assignment',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            email: { type: 'string' },
                            name: { type: 'string' },
                            userRole: { type: 'string', enum: ['CLIENT', 'COLLABORATOR'] },
                          },
                        },
                        accessToken: { type: 'string', description: 'JWT token (in httpOnly cookie)' },
                        refreshToken: { type: 'string', description: 'Refresh token (in httpOnly cookie)' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Email already exists' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user with email and password',
        operationId: 'loginUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                  },
                  password: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            headers: {
              'Set-Cookie': {
                schema: {
                  type: 'string',
                  example:
                    'X-Access-Token=...; HttpOnly; Secure; SameSite=Strict; Path=/; MaxAge=900',
                },
              },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { type: 'object' },
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Get new access token using refresh token (httpOnly cookie)',
        operationId: 'refreshToken',
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Refresh token expired',
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Clear authentication cookies and logout',
        operationId: 'logoutUser',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logout successful',
          },
        },
      },
    },

    // ==================== EQUIPMENT ====================
    '/equipment': {
      get: {
        tags: ['Equipment'],
        summary: 'List all equipment',
        operationId: 'listEquipment',
        parameters: [
          {
            name: 'skip',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Number of items to skip',
          },
          {
            name: 'take',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 },
            description: 'Number of items to take',
          },
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by category',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search by name or description',
          },
        ],
        responses: {
          200: {
            description: 'Equipment list retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        equipment: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Equipment' },
                        },
                        total: { type: 'integer' },
                        skip: { type: 'integer' },
                        take: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Equipment'],
        summary: 'Create equipment (ADMIN)',
        operationId: 'createEquipment',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EquipmentInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Equipment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Equipment' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin only',
          },
        },
      },
    },
    '/equipment/{id}': {
      get: {
        tags: ['Equipment'],
        summary: 'Get equipment by ID',
        operationId: 'getEquipmentById',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Equipment found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Equipment' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Equipment not found',
          },
        },
      },
      put: {
        tags: ['Equipment'],
        summary: 'Update equipment (ADMIN)',
        operationId: 'updateEquipment',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EquipmentInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Equipment updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Equipment' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Equipment not found',
          },
        },
      },
      delete: {
        tags: ['Equipment'],
        summary: 'Delete equipment (ADMIN)',
        operationId: 'deleteEquipment',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          204: {
            description: 'Equipment deleted',
          },
          404: {
            description: 'Equipment not found',
          },
        },
      },
    },

    // ==================== BOOKINGS ====================
    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'List user bookings',
        operationId: 'listBookings',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] },
          },
          {
            name: 'skip',
            in: 'query',
            schema: { type: 'integer', default: 0 },
          },
          {
            name: 'take',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'Bookings list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Booking' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Bookings'],
        summary: 'Create booking',
        operationId: 'createBooking',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Booking created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          409: {
            description: 'Equipment not available for dates',
          },
          422: {
            description: 'Validation error',
          },
        },
      },
    },
    '/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking details',
        operationId: 'getBooking',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Booking found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Booking not found',
          },
        },
      },
      patch: {
        tags: ['Bookings'],
        summary: 'Update booking status',
        operationId: 'updateBooking',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Booking updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Booking not found',
          },
        },
      },
      delete: {
        tags: ['Bookings'],
        summary: 'Cancel booking',
        operationId: 'cancelBooking',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Booking cancelled',
          },
          404: {
            description: 'Booking not found',
          },
        },
      },
    },
  },

  components: {
    schemas: {
      Equipment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          dailyRate: { type: 'number' },
          image: { type: 'string', format: 'uri' },
          available: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'category', 'dailyRate'],
      },
      EquipmentInput: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3 },
          description: { type: 'string' },
          category: { type: 'string' },
          dailyRate: { type: 'number', minimum: 0 },
          image: { type: 'string' },
        },
        required: ['name', 'category', 'dailyRate'],
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          equipmentId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          totalPrice: { type: 'number' },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'userId', 'equipmentId', 'startDate', 'endDate', 'status'],
      },
      BookingInput: {
        type: 'object',
        properties: {
          equipmentId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
        required: ['equipmentId', 'startDate', 'endDate'],
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from login endpoint (stored in httpOnly cookie)',
      },
    },
  },

  tags: [
    {
      name: 'Authentication',
      description: 'User authentication (register, login, logout, refresh)',
    },
    {
      name: 'Equipment',
      description: 'Equipment CRUD operations',
    },
    {
      name: 'Bookings',
      description: 'Booking management',
    },
  ],
};
