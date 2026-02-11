/**
 * Utilitário para garantir datas no fuso horário de Brasília (UTC-3)
 * Resolve problemas de servidores Cloud que rodam em UTC.
 */
export function createDateFromBRT(dateInput: Date | string, timeStr?: string): Date {
  // Garante objeto Date base
  const dateBase = new Date(dateInput);
  
  // Extrai YYYY-MM-DD (Parte Data)
  const dateIso = dateBase.toISOString().split('T')[0];
  
  let hour = 0; 
  let minute = 0;

  if (timeStr) {
    const parts = timeStr.split(':').map(Number);
    hour = parts[0] || 0;
    minute = parts[1] || 0;
  }

  // Monta string ISO com offset explícito de -03:00 (Brasília)
  // Formato Final: 2023-10-25T14:00:00.000-03:00
  const timeIso = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000`;
  const offset = '-03:00'; 
  
  // O construtor do Date lê o offset e ajusta internamente para o UTC correto
  return new Date(`${dateIso}T${timeIso}${offset}`);
}
