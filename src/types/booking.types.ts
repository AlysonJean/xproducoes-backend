import { BookingStatus, DeliveryStatus } from "@prisma/client";

export interface BookingCreateInput {
  // Dados básicos do evento
  eventTitle: string;
  eventDate: Date;
  eventEndDate: Date;
  eventDuration?: number;
  
  // Localização
  location: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  
  // Configurações do evento
  requiresStairs?: boolean;
  isCovered?: boolean;
  hasParking?: boolean;
  
  // Cliente
  clientId?: string;
  clientName: string;
  clientContact: string;
  clientEmail?: string;
  
  // Kit e Equipamentos
  kitId?: string;
  equipmentIds?: string[];
  
  // Observações
  notes?: string;
  specialRequests?: string;
}

export interface BookingUpdateInput {
  // Dados básicos do evento
  eventTitle?: string;
  eventDate?: Date;
  eventEndDate?: Date;
  eventDuration?: number;
  
  // Localização
  location?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  
  // Configurações do evento
  requiresStairs?: boolean;
  isCovered?: boolean;
  hasParking?: boolean;
  
  // Cliente
  clientId?: string;
  clientName?: string;
  clientContact?: string;
  clientEmail?: string;
  
  // Kit e Equipamentos
  kitId?: string;
  equipmentIds?: string[];
  
  // Status
  status?: BookingStatus;
  deliveryStatus?: DeliveryStatus;
  assigneeId?: string;
  
  // Observações
  notes?: string;
  specialRequests?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  deliveryStatus?: DeliveryStatus;
  clientId?: string;
  creatorId?: string;
  assigneeId?: string;
  kitId?: string;
  equipmentIds?: string[];
  eventDateFrom?: Date;
  eventDateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BookingCalendarEvent {
  id: string;
  eventTitle: string;
  eventDate: Date;
  eventEndDate: Date;
  status: BookingStatus;
  location: string;
  client: {
    user: {
      name: string;
    };
  };
  kit?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  equipments: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    category?: {
      name: string;
      color?: string;
    };
  }>;
}

export interface BookingDashboardStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  draftBookings: number;
  inProgressBookings: number;
  completedBookings: number;
  monthlyBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageBookingValue: number;
}
