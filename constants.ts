
import { Team, TeamType } from './types';

export const TEAMS: Team[] = [
  // Technical Teams
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `T${i + 1}`,
    name: `Equipe ${i + 1}`,
    type: TeamType.TECHNICAL,
    base: i + 1 === 1 || i + 1 === 19 ? 'Feliz' :
          [2, 4, 5, 6, 8, 11, 12, 14, 16, 18].includes(i + 1) ? 'Gramado' :
          i + 1 === 3 || i + 1 === 17 ? 'Dois Irmãos' :
          [7, 10, 15, 20].includes(i + 1) ? 'Santa Maria do Herval' :
          i + 1 === 9 ? 'Nova Petrópolis' :
          i + 1 === 13 ? 'Esteio' : 'Gramado',
    hasFusionMachine: false,
    maxDailyTasks: 4
  })),
  // Outsourced
  { id: 'FW1', name: 'Fibrawer 1', type: TeamType.OUTSOURCED, base: 'Esteio', hasFusionMachine: false, maxDailyTasks: 4 },
  { id: 'FW2', name: 'Fibrawer 2', type: TeamType.OUTSOURCED, base: 'Dois Irmãos', hasFusionMachine: false, maxDailyTasks: 4 },
  { id: 'FW3', name: 'Fibrawer 3', type: TeamType.OUTSOURCED, base: 'Dois Irmãos', hasFusionMachine: false, maxDailyTasks: 4 },
  // Support Teams
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `S${i + 1}`,
    name: `Suporte ${i + 1}`,
    type: TeamType.SUPPORT,
    base: [1, 2, 4, 7].includes(i + 1) ? 'Gramado' :
          [6, 8].includes(i + 1) ? 'Santa Maria do Herval' :
          i + 1 === 3 ? 'Nova Petrópolis' : 
          i + 1 === 5 ? 'Dois Irmãos' : 'Gramado', // Suporte 5 corrigido para Dois Irmãos
    hasFusionMachine: true,
    maxDailyTasks: 4 // Atualizado conforme regra de "até 4 períodos"
  }))
];

export const CITIES = [
  'Gramado', 'Canela', 'Três Coroas', 'Santa Maria do Herval', 
  'Nova Petrópolis', 'Feliz', 'Dois Irmãos', 'Morro Reuter', 
  'Picada Café', 'Linha Nova', 'Presidente Lucena', 'Ivoti', 
  'Esteio', 'Sapucaia do Sul'
];

export const SLA_RULES = {
  STANDARD: 24, // hours
  CORP: 6 // hours
};
