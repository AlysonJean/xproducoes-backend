// Seed robusto e idempotente para o backend
// - Cria usuário admin padrão (se não existir)
// - Popula FAQs e Categorias básicas se ausentes
// - Seguro para reexecução

// Carrega variáveis de ambiente (DATABASE_URL, SEED_ADMIN_*)
import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureAdminUser() {
	const email = process.env.SEED_ADMIN_EMAIL || 'admin@xproducoes.local';
	const name = process.env.SEED_ADMIN_NAME || 'Administrador';
	const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) return existing;

	const passwordHash = await bcrypt.hash(password, 10);
	const created = await prisma.user.create({
		data: {
			name,
			email,
			passwordHash,
			role: UserRole.ADMIN,
			verified: true,
			isActive: true,
		},
	});
	return created;
}

async function ensureFaqs() {
	const items: Array<{ question: string; answer: string }> = [
		{
			question: 'Como funciona o processo de orçamento?',
			answer:
				'Você solicita um orçamento pelo site, nossa equipa valida a disponibilidade e envia a proposta com valores e condições.',
		},
		{
			question: 'Existe taxa de entrega e recolha?',
			answer:
				'Sim, a taxa varia conforme a distância e a complexidade logística. Ela é informada no orçamento.',
		},
		{
			question: 'Posso cancelar a reserva?',
			answer:
				'Cancelamentos são possíveis conforme a política de cancelamento indicada na proposta. Podem aplicar-se taxas.',
		},
	];

	for (const faq of items) {
		const exists = await prisma.faq.findFirst({ where: { question: faq.question } });
		if (!exists) {
			await prisma.faq.create({ data: faq });
		}
	}
}

async function ensureCategories() {
	const items: Array<{ name: string; slug: string; description?: string }> = [
		{ name: 'Som', slug: 'som', description: 'Equipamentos de áudio e sonorização' },
		{ name: 'Luz', slug: 'luz', description: 'Iluminação cênica e arquitetural' },
		{ name: 'Vídeo', slug: 'video', description: 'Captação e projeção de vídeo' },
	];

	for (const cat of items) {
		await prisma.category.upsert({
			where: { slug: cat.slug },
			create: cat,
			update: { description: cat.description },
		});
	}
}

async function createIfNotExists(modelName: string, where: any, createData: any) {
	// helper generic - prisma doesn't allow dynamic model access easily here
	// we'll call model-specific helpers instead where necessary
	return null;
}

async function createUserIfNotExists(email: string, name: string, password: string, role: UserRole = UserRole.CLIENT) {
	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) return existing;
	const passwordHash = await bcrypt.hash(password, 10);
	const u = await prisma.user.create({
		data: {
			name,
			email,
			passwordHash,
			role,
			verified: true,
			isActive: true,
		},
	});
	return u;
}

async function createClientProfileForUser(userId: string, overrides: any = {}) {
	const existing = await prisma.client.findUnique({ where: { userId } });
	if (existing) return existing;
	const data = {
		userId,
		phone: overrides.phone || '+5511999990000',
		companyName: overrides.companyName || null,
		industry: overrides.industry || 'Eventos',
		companySize: overrides.companySize || 'SMB',
		address: overrides.address || null,
		jobTitle: overrides.jobTitle || null,
		department: overrides.department || null,
		preferredCategories: overrides.preferredCategories || [],
		eventTypes: overrides.eventTypes || [],
	};
	return prisma.client.create({ data });
}

async function createCollaboratorForUser(userId: string, role: any, overrides: any = {}) {
	const existing = await prisma.collaborator.findUnique({ where: { userId } });
	if (existing) return existing;
	const data = {
		userId,
		collaboratorRole: role,
		specialties: overrides.specialties || ['Eventos ao vivo'],
		status: overrides.status || 'ACTIVE',
		experience: overrides.experience || '5 anos em eventos',
		hourlyRate: overrides.hourlyRate ? new Prisma.Decimal(overrides.hourlyRate) : new Prisma.Decimal(150),
		languages: overrides.languages || ['pt-BR'],
	} as any;
	return prisma.collaborator.create({ data });
}

async function ensureEquipmentsAndKits() {
	const categories = await prisma.category.findMany();
	const cat = categories[0];

	const equipmentsData = [
		{ name: 'Caixa de som ativa JBL EON', description: 'Speaker 15" com 1000W', pricePerHour: '120.00', quantity: 6 },
		{ name: 'Mesa de Som Allen & Heath', description: '24 canais', pricePerHour: '200.00', quantity: 2 },
		{ name: 'Projetor 5000 lúmens', description: 'Projetor para eventos', pricePerHour: '180.00', quantity: 3 },
	];

	const createdEquipments: any[] = [];
	for (const e of equipmentsData) {
		const existing = await prisma.equipment.findFirst({ where: { name: e.name } });
		if (existing) {
			createdEquipments.push(existing);
			continue;
		}
		const created = await prisma.equipment.create({
			data: {
				name: e.name,
				description: e.description,
				imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
			pricePerHour: new Prisma.Decimal(e.pricePerHour),
				quantity: e.quantity,
				categoryId: cat.id,
			},
		});
		createdEquipments.push(created);
	}

	// create a sample kit containing first two equipments
	const kitName = 'Kit PA Básico';
	const existingKit = await prisma.kit.findFirst({ where: { name: kitName } });
	if (!existingKit) {
		await prisma.kit.create({
			data: {
				name: kitName,
				description: 'Kit de sonorização básico para eventos pequenos',
			price: new Prisma.Decimal('450.00'),
				imageUrl: 'https://res.cloudinary.com/demo/image/upload/kit-pa.png',
				tags: ['pa', 'som', 'evento'],
				equipments: { connect: createdEquipments.slice(0, 2).map((eq) => ({ id: eq.id })) },
			},
		});
	}
}

async function createBookingsSample(adminUser: any, clientUser: any, clientProfile: any) {
	// create one booking per client
	const existing = await prisma.booking.findFirst({ where: { clientId: clientProfile.id } });
	if (existing) return existing;
	const now = new Date();
	const eventDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 dias
	const booking = await prisma.booking.create({
		data: {
			eventTitle: 'Evento Corporativo - Lançamento',
			eventDate,
			eventEndDate: new Date(eventDate.getTime() + 1000 * 60 * 60 * 4),
			totalPrice: new Prisma.Decimal('1250.00'),
			status: 'PENDING',
			clientId: clientProfile.id,
			creatorId: adminUser.id,
			clientName: clientUser.name,
			clientEmail: clientUser.email,
			notes: 'Pedido de prova de som e luz',
			city: 'São Paulo',
		},
	});
	return booking;
}

async function createPortfolioSamples() {
	const exists = await prisma.portfolio.findFirst({});
	if (exists) return;
	await prisma.portfolio.create({
		data: {
			title: 'Show de Lançamento - Cliente X',
			description: 'Cobertura completa do evento',
			eventDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
			imageUrl: 'https://res.cloudinary.com/demo/image/upload/portfolio1.jpg',
		},
	});
}

async function createContactSamples() {
	const exists = await prisma.contact.findFirst({ where: { email: 'cliente.teste@exemplo.com' } });
	if (exists) return;
	await prisma.contact.create({ data: { name: 'Cliente Teste', email: 'cliente.teste@exemplo.com', message: 'Gostaria de um orçamento para evento em setembro.' } });
}

async function createReviewSamples(booking: any, reviewerUser: any) {
	const exists = await prisma.review.findFirst({ where: { bookingId: booking.id } });
	if (exists) return;
	await prisma.review.create({
		data: {
			bookingId: booking.id,
			reviewerId: reviewerUser.id,
			rating: 5,
			comment: 'Excelente serviço, equipe pontual e profissional.',
			photos: [],
			tags: ['pontualidade', 'qualidade'],
		},
	});
}

async function main() {
	console.log('[seed] Iniciando seed...');

	// Proteção: só executar seed quando RUN_SEED=true (previne execução em ambientes de dev/CI sem intenção)
	const shouldRun = String(process.env.RUN_SEED || '').toLowerCase() === 'true';
	if (!shouldRun) {
		console.log('[seed] RUN_SEED != true — seed ignorado (defina RUN_SEED=true para executar)');
		await prisma.$disconnect();
		process.exit(0);
	}
	if (!process.env.DATABASE_URL) {
		console.warn('[seed] DATABASE_URL não definida. Abortando seed para evitar falhas.');
		return;
	}
	const admin = await ensureAdminUser();
	console.log('[seed] Admin pronto:', admin.email);

	await ensureFaqs();
	console.log('[seed] FAQs garantidas');

	await ensureCategories();
	console.log('[seed] Categorias garantidas');

	// Criar usuários de teste
	const clientUser = await createUserIfNotExists('cliente.teste@exemplo.com', 'Cliente Teste', 'cliente123');
	console.log('[seed] Cliente criado:', clientUser.email);
	const clientProfile = await createClientProfileForUser(clientUser.id, { companyName: 'Empresa Teste' });

	const collabUser = await createUserIfNotExists('colaborador.teste@exemplo.com', 'Colaborador Teste', 'colab123', UserRole.COLLABORATOR);
	console.log('[seed] Colaborador criado:', collabUser.email);
	await createCollaboratorForUser(collabUser.id, 'PHOTOGRAPHER');

	await ensureEquipmentsAndKits();
	console.log('[seed] Equipamentos e kits garantidos');

	const booking = await createBookingsSample(admin, clientUser, clientProfile);
	console.log('[seed] Booking criado:', booking.id);

	await createPortfolioSamples();
	console.log('[seed] Portfolios garantidos');

	await createContactSamples();
	console.log('[seed] Contatos de exemplo criados');

	await createReviewSamples(booking, clientUser);
	console.log('[seed] Reviews criadas');

	console.log('[seed] Seed completo. Credenciais de teste:');
	console.log('  Admin:', process.env.SEED_ADMIN_EMAIL || 'admin@xproducoes.local', '/', process.env.SEED_ADMIN_PASSWORD || 'admin123');
	console.log('  Cliente:', clientUser.email, '/ cliente123');
	console.log('  Colaborador:', collabUser.email, '/ colab123');
}

main()
	.then(async () => {
		await prisma.$disconnect();
		process.exit(0);
	})
	.catch(async (e) => {
		console.error('[seed] Falhou:', e);
		await prisma.$disconnect();
		process.exit(1);
	});

