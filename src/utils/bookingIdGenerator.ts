export function generateSemanticBookingId(clientName: string): string {
  const now = new Date();
  
  // 1. Prefixo
  const prefix = "XP";
  
  // 2. Nome do cliente (limpo, maiúsculas, max 5 chars)
  const cleanName = clientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z]/g, "") // Mantém apenas letras
    .toUpperCase()
    .substring(0, 5) || "CLI";
    
  // 3. Data e Hora
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // 4. Sufixo aleatório (3 chars) para garantir unicidade em requisições simultâneas
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${prefix}-${cleanName}-${year}${month}${day}-${hours}${minutes}-${random}`;
}
