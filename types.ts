
export enum TeamType {
  TECHNICAL = 'Técnica',
  SUPPORT = 'Suporte',
  OUTSOURCED = 'Terceirizada'
}

export enum DemandType {
  SUPPORT_TICKET = 'Suporte Técnico',
  COMMERCIAL_INSTALL = 'Instalação Comercial',
  UPGRADE = 'Upgrade/Downgrade',
  ADDRESS_CHANGE = 'Mudança de Endereço'
}

export enum Priority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica (Sem Acesso)'
}

export interface Location {
  base: string;
  coverage: string[];
}

export interface Team {
  id: string;
  name: string;
  type: TeamType;
  base: string;
  hasFusionMachine: boolean;
  maxDailyTasks: number;
}

export interface Ticket {
  id: string;
  customerName: string;
  customerType: 'PF' | 'PJ' | 'PME' | 'CORP';
  type: DemandType;
  priority: Priority;
  location: string;
  createdAt: Date;
  slaDeadline: Date;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED';
}

export interface ScheduleSlot {
  id: string;
  teamId: string;
  ticketId: string;
  period: 1 | 2 | 3 | 4; // 1,2 morning, 3,4 afternoon
  date: string;
}

export interface WeatherCondition {
  isRainy: boolean;
  intensity: 'Light' | 'Heavy';
}
