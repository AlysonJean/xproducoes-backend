/**
 * ✅ ENTERPRISE COMMON TYPES
 * Tipos comuns usados em toda a aplicação
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * ✅ ERROR TYPES - Tipagem segura para erros
 */
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  status?: number;
  details?: unknown;
}

export function createAppError(message: string, statusCode: number, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.status = statusCode;
  if (code) error.code = code;
  return error;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof Error;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
}

export function getErrorCode(error: unknown): string | undefined {
  if (isAppError(error)) return error.code;
  return undefined;
}

/**
 * ✅ ASYNC HANDLER - Wrapper para controllers com tipagem correta
 */
export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * ✅ PRISMA ERROR TYPES
 */
export function isPrismaError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isPrismaValidationError(
  error: unknown
): error is Prisma.PrismaClientValidationError {
  return error instanceof Prisma.PrismaClientValidationError;
}

/**
 * ✅ USER DATA TYPES
 */
export interface UserUpdateData {
  name?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  profileSettings?: Record<string, unknown>;
}

export interface ClientData {
  phone?: string;
  companyName?: string;
  industry?: string;
  companySize?: string;
  address?: AddressData;
  jobTitle?: string;
  department?: string;
  budget?: BudgetData;
  preferredCategories?: string[];
  eventTypes?: string[];
  communicationPrefs?: CommunicationPrefs;
}

export interface AddressData {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface BudgetData {
  min?: number;
  max?: number;
  currency?: string;
}

export interface CommunicationPrefs {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  phone?: boolean;
}

/**
 * ✅ API RESPONSE TYPES
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * ✅ REQUEST TYPES
 * Nota: AuthenticatedRequest está definido em middlewares/unifiedAuth.ts
 * Use import { AuthenticatedRequest } from '../middlewares/unifiedAuth';
 */
export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    role: string;
    isActive: boolean;
    isVip?: boolean;
  };
}

/**
 * ✅ CHECKLIST ITEM TYPE
 */
export interface ChecklistItemInput {
  description: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

/**
 * ✅ GOOGLE AUTH TYPES
 */
export interface GoogleTokenValidation {
  valid: boolean;
  email?: string;
  name?: string;
  sub?: string;
  picture?: string;
  error?: string;
}

export interface GoogleUserData {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

/**
 * ✅ COLLABORATOR TYPES
 */
export interface CollaboratorUpdateData {
  phone?: string;
  specialties?: string[];
  experience?: string;
  portfolio?: Record<string, unknown>;
  hourlyRate?: number;
  equipment?: string[];
  certifications?: string[];
  workingRadius?: number;
  languages?: string[];
}

export interface EventCollaborator {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  specialties?: string[];
}

/**
 * ✅ BOOKING TYPES
 */
export interface BookingUpdateData {
  status?: string;
  eventDate?: Date;
  eventEndDate?: Date;
  totalPrice?: number;
  notes?: string;
  eventLocation?: string;
  eventAddress?: string;
  eventType?: string;
}

/**
 * ✅ DNS LOOKUP TYPE (para safeFetch)
 */
export interface LookupOptions {
  family?: number;
  hints?: number;
  all?: boolean;
}

export type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | string[],
  family?: number
) => void;

/**
 * ✅ TYPE GUARDS
 */
export function hasMessage(obj: unknown): obj is { message: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof (obj as { message: unknown }).message === 'string'
  );
}

export function hasCode(obj: unknown): obj is { code: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    typeof (obj as { code: unknown }).code === 'string'
  );
}
