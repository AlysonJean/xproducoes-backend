import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Proteção: só executar seed quando RUN_SEED=true para evitar populações acidentais em cada run
  const shouldRun = String(process.env.RUN_SEED || '').toLowerCase() === 'true';
  if (!shouldRun) {
    console.log('[seed] RUN_SEED != true — seed ignorado (defina RUN_SEED=true para executar)');
    return;
  }

  // ========== USUÁRIOS ==========
  console.log("👥 Criando usuários...");
  
  const adminPassword = await bcrypt.hash("admin123", 10);
  const clientPassword = await bcrypt.hash("cliente123", 10);
  const collabPassword = await bcrypt.hash("colaborador123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@xproducoes.com" },
    update: {},
    create: {
      name: "Carlos Silva",
      email: "admin@xproducoes.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      isActive: true,
      verified: true,
      bio: "Fundador da X Produções, especialista em eventos corporativos e casamentos.",
      location: "São Paulo, SP",
      website: "https://xproducoes.com",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    },
  });

  const client1 = await prisma.user.upsert({
    where: { email: "maria.santos@empresa.com" },
    update: {},
    create: {
      name: "Maria Santos",
      email: "maria.santos@empresa.com",
      passwordHash: clientPassword,
      role: "CLIENT",
      isActive: true,
      verified: true,
      bio: "Organizadora de eventos corporativos na TechCorp.",
      location: "Rio de Janeiro, RJ",
      avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: "joao.oliveira@eventos.com" },
    update: {},
    create: {
      name: "João Oliveira",
      email: "joao.oliveira@eventos.com",
      passwordHash: clientPassword,
      role: "CLIENT",
      isActive: true,
      verified: true,
      bio: "Wedding planner com 15 anos de experiência.",
      location: "Belo Horizonte, MG",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    },
  });

  const collaborator1 = await prisma.user.upsert({
    where: { email: "ana.fotografa@xproducoes.com" },
    update: {},
    create: {
      name: "Ana Costa",
      email: "ana.fotografa@xproducoes.com",
      passwordHash: collabPassword,
      role: "COLLABORATOR",
      isActive: true,
      verified: true,
      bio: "Fotógrafa especializada em casamentos e eventos sociais.",
      location: "São Paulo, SP",
      website: "https://anacosta.photography",
      avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    },
  });

  const collaborator2 = await prisma.user.upsert({
    where: { email: "pedro.videomaker@xproducoes.com" },
    update: {},
    create: {
      name: "Pedro Almeida",
      email: "pedro.videomaker@xproducoes.com",
      passwordHash: collabPassword,
      role: "COLLABORATOR",
      isActive: true,
      verified: true,
      bio: "Videomaker e editor especializado em eventos corporativos.",
      location: "São Paulo, SP",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    },
  });

  // ========== PERFIS DE CLIENTE ==========
  console.log("🏢 Criando perfis de cliente...");

  await prisma.client.upsert({
    where: { id: client1.id },
    update: {},
    create: {
      id: client1.id,
      phone: "(21) 99999-1234",
      companyName: "TechCorp Soluções",
      industry: "Tecnologia",
      companySize: "201-500 funcionários",
      address: {
        street: "Av. Atlântica, 1000",
        city: "Rio de Janeiro",
        state: "RJ",
        zipCode: "22070-111",
        country: "Brasil"
      },
      jobTitle: "Gerente de Eventos",
      department: "Marketing",
      budget: { min: 10000, max: 50000, currency: "BRL" },
      preferredCategories: ["fotografia", "audiovisual", "iluminacao"],
      eventTypes: ["corporativo", "lançamento", "confraternização"],
      userId: client1.id,
    },
  });

  await prisma.client.upsert({
    where: { id: client2.id },
    update: {},
    create: {
      id: client2.id,
      phone: "(31) 98888-5678",
      companyName: "Eventos Premium",
      industry: "Eventos",
      companySize: "11-50 funcionários",
      address: {
        street: "Rua da Bahia, 456",
        city: "Belo Horizonte",
        state: "MG",
        zipCode: "30160-011",
        country: "Brasil"
      },
      jobTitle: "Wedding Planner",
      department: "Planejamento",
      budget: { min: 20000, max: 100000, currency: "BRL" },
      preferredCategories: ["fotografia", "decoracao", "sonorizacao"],
      eventTypes: ["casamento", "festa", "social"],
      userId: client2.id,
    },
  });

  // ========== PERFIS DE COLABORADOR ==========
  console.log("📸 Criando perfis de colaborador...");

  const anaCollaborator = await prisma.collaborator.upsert({
    where: { id: collaborator1.id },
    update: {},
    create: {
      id: collaborator1.id,
      phone: "(11) 97777-1111",
      collaboratorRole: "PHOTOGRAPHER",
      specialties: ["Fotografia de Casamento", "Ensaio Pré-Wedding", "Eventos Sociais"],
      experience: "8 anos",
      portfolio: {
        instagram: "https://instagram.com/anacosta.photo",
        behance: "https://behance.net/anacosta",
        website: "https://anacosta.photography"
      },
      equipment: ["Canon EOS R5", "Sony A7 III", "Lentes 24-70mm", "Flash Godox"],
      hourlyRate: 250,
      languages: ["Português", "Inglês"],
      averageRating: 4.9,
      completedEvents: 127,
      certifications: ["Certificação Adobe", "Workshop Casamentos"],
      status: "ACTIVE",
      userId: collaborator1.id,
    },
  });

  const pedroCollaborator = await prisma.collaborator.upsert({
    where: { id: collaborator2.id },
    update: {},
    create: {
      id: collaborator2.id,
      phone: "(11) 96666-2222",
      collaboratorRole: "VIDEOGRAPHER",
      specialties: ["Filmagem Corporativa", "Edição de Vídeo", "Motion Graphics"],
      experience: "5 anos",
      portfolio: {
        youtube: "https://youtube.com/pedroalmeida",
        vimeo: "https://vimeo.com/pedroalmeida",
        website: "https://pedroalmeida.video"
      },
      equipment: ["Sony FX3", "DJI Ronin", "Microfone Rode", "Kit Iluminação LED"],
      hourlyRate: 300,
      languages: ["Português"],
      averageRating: 4.8,
      completedEvents: 89,
      certifications: ["Certificação DaVinci Resolve", "Curso Adobe Premiere"],
      status: "ACTIVE",
      userId: collaborator2.id,
    },
  });

  // ========== CATEGORIAS ==========
  console.log("📂 Criando categorias...");

  const catFotografia = await prisma.category.upsert({
    where: { slug: "fotografia" },
    update: {},
    create: {
      name: "Fotografia",
      slug: "fotografia",
      description: "Equipamentos profissionais para fotografia em eventos",
      color: "#2196F3",
      icon: "camera",
      active: true,
    },
  });

  const catAudiovisual = await prisma.category.upsert({
    where: { slug: "audiovisual" },
    update: {},
    create: {
      name: "Audiovisual",
      slug: "audiovisual",
      description: "Equipamentos de som e vídeo para eventos",
      color: "#FF5722",
      icon: "video",
      active: true,
    },
  });

  const catIluminacao = await prisma.category.upsert({
    where: { slug: "iluminacao" },
    update: {},
    create: {
      name: "Iluminação",
      slug: "iluminacao",
      description: "Sistemas de iluminação profissional",
      color: "#FFC107",
      icon: "lightbulb",
      active: true,
    },
  });

  const catSonorizacao = await prisma.category.upsert({
    where: { slug: "sonorizacao" },
    update: {},
    create: {
      name: "Sonorização",
      slug: "sonorizacao",
      description: "Equipamentos de áudio e som ambiente",
      color: "#9C27B0",
      icon: "speaker",
      active: true,
    },
  });

  const catDecoracao = await prisma.category.upsert({
    where: { slug: "decoracao" },
    update: {},
    create: {
      name: "Decoração",
      slug: "decoracao",
      description: "Mobiliário e decoração para eventos",
      color: "#E91E63",
      icon: "flower",
      active: true,
    },
  });

  // ========== EQUIPAMENTOS ==========
  console.log("🎥 Criando equipamentos...");

  // Fotografia
  const canonR6 = await prisma.equipment.upsert({
    where: { serialNumber: "CAM-001-R6" },
    update: {},
    create: {
      name: "Canon EOS R6 Mark II",
      description: "Câmera mirrorless full-frame com 24.2MP, ideal para fotografia de eventos e casamentos",
      imageUrl: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=600&fit=crop",
      serialNumber: "CAM-001-R6",
      pricePerHour: 150,
      quantity: 3,
      isAvailable: true,
      tags: ["câmera", "canon", "mirrorless", "24mp", "full-frame"],
      condition: "EXCELLENT",
      specifications: {
        sensor: "Full-frame CMOS 24.2MP",
        iso: "100-102400",
        video: "4K UHD 60fps",
        stabilization: "5-axis IBIS",
        battery: "LP-E6NH"
      },
      categoryId: catFotografia.id,
      minimumRentalDuration: 4,
      location: "São Paulo - Centro",
    },
  });

  const sonyA7IV = await prisma.equipment.upsert({
    where: { serialNumber: "CAM-002-A7IV" },
    update: {},
    create: {
      name: "Sony Alpha 7 IV",
      description: "Câmera mirrorless de 33MP com excelente desempenho em baixa luz",
      imageUrl: "https://images.unsplash.com/photo-1617005082133-75d6cb5892e3?w=800&h=600&fit=crop",
      serialNumber: "CAM-002-A7IV",
      pricePerHour: 140,
      quantity: 2,
      isAvailable: true,
      tags: ["câmera", "sony", "mirrorless", "33mp", "baixa-luz"],
      condition: "EXCELLENT",
      specifications: {
        sensor: "Full-frame Exmor R 33MP",
        iso: "50-204800",
        video: "4K UHD 60fps",
        stabilization: "5-axis IBIS",
        battery: "NP-FZ100"
      },
      categoryId: catFotografia.id,
      minimumRentalDuration: 4,
      location: "São Paulo - Centro",
    },
  });

  // Lentes
  await prisma.equipment.upsert({
    where: { serialNumber: "LENS-001-2470" },
    update: {},
    create: {
      name: "Canon RF 24-70mm f/2.8L IS USM",
      description: "Lente zoom padrão profissional com estabilização de imagem",
      imageUrl: "https://images.unsplash.com/photo-1606983340057-0dd7911b9a1c?w=800&h=600&fit=crop",
      serialNumber: "LENS-001-2470",
      pricePerHour: 80,
      quantity: 4,
      isAvailable: true,
      tags: ["lente", "canon", "24-70mm", "f2.8", "estabilizada"],
      condition: "EXCELLENT",
      specifications: {
        mount: "Canon RF",
        focalLength: "24-70mm",
        aperture: "f/2.8",
        stabilization: "Ótica IS",
        weight: "900g"
      },
      categoryId: catFotografia.id,
      minimumRentalDuration: 2,
      location: "São Paulo - Centro",
    },
  });

  // Audiovisual
  const sonyFX3 = await prisma.equipment.upsert({
    where: { serialNumber: "VID-001-FX3" },
    update: {},
    create: {
      name: "Sony FX3 Cinema Camera",
      description: "Câmera de cinema full-frame com gravação 4K 120p",
      imageUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop",
      serialNumber: "VID-001-FX3",
      pricePerHour: 200,
      quantity: 2,
      isAvailable: true,
      tags: ["câmera", "cinema", "4k", "120fps", "full-frame"],
      condition: "EXCELLENT",
      specifications: {
        sensor: "Full-frame Exmor R",
        recording: "4K UHD 120p",
        codec: "XAVC S-I",
        iso: "80-409600",
        ports: "HDMI, SDI, USB-C"
      },
      categoryId: catAudiovisual.id,
      minimumRentalDuration: 8,
      location: "São Paulo - Centro",
    },
  });

  // Iluminação
  await prisma.equipment.upsert({
    where: { serialNumber: "LED-001-PANEL" },
    update: {},
    create: {
      name: "Aputure Light Storm LS 300x",
      description: "Painel LED bi-color de 300W com controle sem fio",
      imageUrl: "https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=800&h=600&fit=crop",
      serialNumber: "LED-001-PANEL",
      pricePerHour: 100,
      quantity: 6,
      isAvailable: true,
      tags: ["led", "300w", "bi-color", "wireless", "painel"],
      condition: "EXCELLENT",
      specifications: {
        power: "300W",
        temperature: "2700K-6500K",
        cri: "95+",
        control: "2.4GHz wireless",
        mount: "Bowens"
      },
      categoryId: catIluminacao.id,
      minimumRentalDuration: 4,
      location: "São Paulo - Centro",
    },
  });

  // Sonorização
  await prisma.equipment.upsert({
    where: { serialNumber: "AUD-001-MIXER" },
    update: {},
    create: {
      name: "Yamaha MG16XU",
      description: "Mesa de som analógica 16 canais com efeitos digitais",
      imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
      serialNumber: "AUD-001-MIXER",
      pricePerHour: 120,
      quantity: 3,
      isAvailable: true,
      tags: ["mesa-som", "16-canais", "efeitos", "yamaha", "analógica"],
      condition: "EXCELLENT",
      specifications: {
        channels: "16",
        effects: "SPX digital reverb",
        usb: "USB 2.0 interface",
        phantom: "+48V",
        eq: "3-band EQ"
      },
      categoryId: catSonorizacao.id,
      minimumRentalDuration: 6,
      location: "São Paulo - Centro",
    },
  });

  // ========== KITS ==========
  console.log("📦 Criando kits...");

  const kitCasamento = await prisma.kit.create({
    data: {
      name: "Kit Casamento Completo",
      description: "Kit completo para fotografia e filmagem de casamentos com 2 câmeras, lentes e acessórios",
      imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop",
      price: 400,
      isAvailable: true,
      tags: ["casamento", "fotografia", "vídeo", "completo"],
      equipments: {
        connect: [
          { id: canonR6.id },
          { id: sonyA7IV.id },
          { id: sonyFX3.id }
        ]
      },
      category: "Fotografia",
    },
  });

  const kitCorporativo = await prisma.kit.create({
    data: {
      name: "Kit Evento Corporativo",
      description: "Solução completa para eventos corporativos com som, vídeo e iluminação",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
      price: 600,
      isAvailable: true,
      tags: ["corporativo", "palestra", "conferência", "completo"],
      equipments: {
        connect: [
          { id: sonyFX3.id }
        ]
      },
      category: "Audiovisual",
    },
  });

  // ========== PORTFÓLIO ==========
  console.log("🖼️ Criando portfólio...");

  await prisma.portfolio.upsert({
    where: { id: "portfolio-1" },
    update: {},
    create: {
      id: "portfolio-1",
      title: "Casamento Marina & João",
      description: "Celebração intimista em fazenda histórica com 150 convidados. Fotografia e filmagem completa do grande dia.",
      eventDate: new Date("2024-11-15"),
      imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=800&fit=crop",
    },
  });

  await prisma.portfolio.upsert({
    where: { id: "portfolio-2" },
    update: {},
    create: {
      id: "portfolio-2",
      title: "Lançamento TechCorp 2024",
      description: "Evento corporativo de lançamento de produto com 300 participantes. Cobertura completa do evento.",
      eventDate: new Date("2024-10-22"),
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop",
    },
  });

  await prisma.portfolio.upsert({
    where: { id: "portfolio-3" },
    update: {},
    create: {
      id: "portfolio-3",
      title: "Festa de 15 Anos - Isabella",
      description: "Festa de debutante com tema vintage em salão de festas. Decoração temática e fotografia social.",
      eventDate: new Date("2024-12-08"),
      imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=800&fit=crop",
    },
  });

  await prisma.portfolio.upsert({
    where: { id: "portfolio-4" },
    update: {},
    create: {
      id: "portfolio-4",
      title: "Conferência Médica AMESP",
      description: "Conferência médica com transmissão ao vivo para 500 participantes online e 200 presenciais.",
      eventDate: new Date("2024-09-30"),
      imageUrl: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&h=800&fit=crop",
    },
  });

  // ========== BOOKINGS ==========
  console.log("📅 Criando reservas...");

  const booking1 = await prisma.booking.create({
    data: {
      eventTitle: "Casamento Ana & Pedro",
      eventDate: new Date("2025-09-15"),
      eventEndDate: new Date("2025-09-15T23:00:00"),
      totalPrice: 5500,
      status: "CONFIRMED",
      location: "Igreja São Francisco + Buffet Jardim das Flores",
      clientId: client2.id,
      creatorId: client2.id,
      specialRequests: "Filmagem da cerimônia religiosa e festa. Fotos do making of da noiva.",
      notes: "Cerimônia religiosa seguida de recepção para 200 convidados",
      equipments: {
        connect: [
          { id: canonR6.id },
          { id: sonyA7IV.id },
          { id: sonyFX3.id }
        ]
      },
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      eventTitle: "Lançamento Produto TechStart",
      eventDate: new Date("2025-08-20"),
      eventEndDate: new Date("2025-08-20T22:00:00"),
      totalPrice: 3200,
      status: "CONFIRMED",
      location: "Centro de Convenções Anhembi",
      clientId: client1.id,
      creatorId: client1.id,
      specialRequests: "Transmissão ao vivo no YouTube e Instagram. Entrevistas com executivos.",
      notes: "Evento de lançamento do novo aplicativo da empresa",
      equipments: {
        connect: [
          { id: sonyFX3.id }
        ]
      },
    },
  });

  // ========== REVIEWS ==========
  console.log("⭐ Criando avaliações...");

  await prisma.review.create({
    data: {
      rating: 5,
      comment: "Serviço excepcional! A equipe conseguiu capturar momentos únicos do nosso casamento. As fotos e vídeos ficaram lindos. Recomendo muito a X Produções!",
      photos: [
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop"
      ],
      tags: ["profissional", "pontual", "criativo", "atencioso"],
      punctuality: 5,
      professionalism: 5,
      quality: 5,
      communication: 5,
      valueForMoney: 5,
      helpful: 15,
      reported: false,
      bookingId: booking1.id,
      reviewerId: client2.id,
      collaboratorId: anaCollaborator.id,
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: "Excelente profissional! A filmagem do nosso evento corporativo ficou perfeita. A qualidade do vídeo é cinematográfica e conseguiu captar a essência do evento.",
      photos: [
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop"
      ],
      tags: ["qualidade", "profissional", "criativo", "eficiente"],
      punctuality: 5,
      professionalism: 5,
      quality: 5,
      communication: 4,
      valueForMoney: 5,
      helpful: 8,
      reported: false,
      bookingId: booking2.id,
      reviewerId: client1.id,
      collaboratorId: pedroCollaborator.id,
    },
  });

  // ========== FAQ ==========
  console.log("❓ Criando FAQ...");

  await prisma.faq.upsert({
    where: { id: "faq-1" },
    update: {},
    create: {
      id: "faq-1",
      question: "Como funciona o aluguel de equipamentos?",
      answer: "O aluguel é feito por períodos mínimos que variam conforme o equipamento. Câmeras profissionais têm aluguel mínimo de 4 horas, enquanto equipamentos de som e luz podem ser alugados por períodos maiores. Todos os equipamentos passam por revisão antes da entrega.",
    },
  });

  await prisma.faq.upsert({
    where: { id: "faq-2" },
    update: {},
    create: {
      id: "faq-2",
      question: "Vocês fornecem técnicos junto com os equipamentos?",
      answer: "Sim! Para eventos corporativos e casamentos, recomendamos nossos colaboradores especializados. Eles conhecem bem os equipamentos e garantem o melhor resultado para seu evento.",
    },
  });

  await prisma.faq.upsert({
    where: { id: "faq-3" },
    update: {},
    create: {
      id: "faq-3",
      question: "Qual é a política de cancelamento?",
      answer: "Cancelamentos com mais de 48h de antecedência: reembolso integral. Entre 24h e 48h: cobrança de 50%. Menos de 24h: cobrança integral. Para eventos com data marcada há mais de 30 dias, cancelamentos até 7 dias antes têm reembolso de 80%.",
    },
  });

  await prisma.faq.upsert({
    where: { id: "faq-4" },
    update: {},
    create: {
      id: "faq-4",
      question: "Os equipamentos são entregues no local do evento?",
      answer: "Sim, fazemos entrega em toda a região metropolitana de São Paulo. Para locais fora dessa região, consultamos disponibilidade e custos adicionais. A entrega é feita por nossa equipe técnica que também faz a montagem quando necessário.",
    },
  });

  // ========== CONTATOS ==========
  console.log("📧 Criando mensagens de contato...");

  await prisma.contact.create({
    data: {
      name: "Lucia Fernandes",
      email: "lucia.fernandes@gmail.com",
      message: "Olá! Estou organizando o casamento da minha filha para dezembro e gostaria de saber sobre pacotes completos de fotografia e vídeo. O evento será para aproximadamente 180 convidados.",
      isRead: false,
    },
  });

  await prisma.contact.create({
    data: {
      name: "Roberto Silva",
      email: "roberto@empresax.com.br",
      message: "Precisamos de orçamento para evento corporativo em setembro. Será uma confraternização de fim de ano com 80 pessoas. Precisamos de som, luz e filmagem.",
      isRead: true,
    },
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log("📊 Dados criados:");
  console.log("   - 5 usuários (1 admin, 2 clientes, 2 colaboradores)");
  console.log("   - 5 categorias de equipamentos");
  console.log("   - 6 equipamentos profissionais");
  console.log("   - 2 kits de locação");
  console.log("   - 4 projetos no portfólio");
  console.log("   - 2 reservas ativas");
  console.log("   - 3 avaliações de clientes");
  console.log("   - 4 perguntas frequentes");
  console.log("   - 2 mensagens de contato");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
