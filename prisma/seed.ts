import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Stocker...');

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  await prisma.auditLog.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.table.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.transferLineItem.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.purchaseInvoice.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.userLocation.deleteMany();
  await prisma.userBusiness.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.business.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  // Crear negocio (Business)
  console.log('🏢 Creando negocio...');
  const business = await prisma.business.create({
    data: {
      name: 'Restaurante Demo Lda',
      slug: 'restaurante-demo',
      plan: 'GROWTH',
      active: true,
      maxRestaurants: 10,
      maxUsers: 20,
      vertical: 'RESTAURANT',
    },
  });
  console.log('✅ Negocio creado:', business.name);

  // Crear usuarios
  console.log('👤 Creando usuarios...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@stocker.pt',
      name: 'Admin Principal',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      phone: '+351 912 345 678',
      language: 'pt-PT',
      active: true,
    },
  });

  const warehouseManager = await prisma.user.create({
    data: {
      email: 'warehouse@stocker.pt',
      name: 'João Silva',
      password: await bcrypt.hash('manager123', 10),
      role: 'WAREHOUSE_MANAGER',
      phone: '+351 923 456 789',
      language: 'pt-PT',
      active: true,
    },
  });

  const restaurantManager1 = await prisma.user.create({
    data: {
      email: 'rest1@stocker.pt',
      name: 'Maria Santos',
      password: await bcrypt.hash('manager123', 10),
      role: 'RESTAURANT_MANAGER',
      phone: '+351 934 567 890',
      language: 'pt-PT',
      active: true,
    },
  });

  const restaurantManager2 = await prisma.user.create({
    data: {
      email: 'rest2@stocker.pt',
      name: 'Pedro Costa',
      password: await bcrypt.hash('manager123', 10),
      role: 'RESTAURANT_MANAGER',
      phone: '+351 945 678 901',
      language: 'pt-PT',
      active: true,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      email: 'cashier@stocker.pt',
      name: 'Ana Ferreira',
      password: await bcrypt.hash('cashier123', 10),
      role: 'CASHIER',
      phone: '+351 956 789 012',
      language: 'pt-PT',
      active: true,
    },
  });

  console.log('✅ Usuarios creados');

  // Asignar usuarios al negocio con roles
  console.log('🔗 Asignando usuarios al negocio...');
  await prisma.userBusiness.create({
    data: {
      userId: admin.id,
      businessId: business.id,
      role: 'OWNER',
    },
  });

  await prisma.userBusiness.create({
    data: {
      userId: warehouseManager.id,
      businessId: business.id,
      role: 'MANAGER',
    },
  });

  await prisma.userBusiness.create({
    data: {
      userId: restaurantManager1.id,
      businessId: business.id,
      role: 'MANAGER',
    },
  });

  await prisma.userBusiness.create({
    data: {
      userId: restaurantManager2.id,
      businessId: business.id,
      role: 'MANAGER',
    },
  });

  await prisma.userBusiness.create({
    data: {
      userId: cashier.id,
      businessId: business.id,
      role: 'MANAGER',
    },
  });

  console.log('✅ Usuarios asignados al negocio');

  // Crear sedes (locations)
  console.log('🏢 Creando sedes...');
  const warehouse = await prisma.location.create({
    data: {
      businessId: business.id,
      name: 'Armazém Central',
      type: 'WAREHOUSE',
      address: 'Rua do Armazém, 100',
      city: 'Lisboa',
      postalCode: '1000-001',
      phone: '+351 210 123 456',
      email: 'armazem@stocker.pt',
      isActive: true,
    },
  });

  const restaurant1 = await prisma.location.create({
    data: {
      businessId: business.id,
      name: 'Restaurante Chiado',
      type: 'RESTAURANT',
      address: 'Rua Garrett, 50',
      city: 'Lisboa',
      postalCode: '1200-001',
      phone: '+351 210 234 567',
      email: 'chiado@stocker.pt',
      isActive: true,
    },
  });

  const restaurant2 = await prisma.location.create({
    data: {
      businessId: business.id,
      name: 'Restaurante Bairro Alto',
      type: 'RESTAURANT',
      address: 'Rua da Atalaia, 25',
      city: 'Lisboa',
      postalCode: '1200-002',
      phone: '+351 210 345 678',
      email: 'bairroalto@stocker.pt',
      isActive: true,
    },
  });

  console.log('✅ Sedes creadas');

  // Asignar usuarios a sedes con roles específicos
  console.log('🔗 Asignando usuarios a sedes...');
  
  // Admin tiene acceso a todas las sedes
  await prisma.userLocation.create({
    data: {
      userId: admin.id,
      locationId: warehouse.id,
    },
  });

  // Warehouse Manager
  await prisma.userLocation.create({
    data: {
      userId: warehouseManager.id,
      locationId: warehouse.id,
    },
  });

  // Restaurant Manager 1
  await prisma.userLocation.create({
    data: {
      userId: restaurantManager1.id,
      locationId: restaurant1.id,
    },
  });

  // Restaurant Manager 2
  await prisma.userLocation.create({
    data: {
      userId: restaurantManager2.id,
      locationId: restaurant2.id,
    },
  });

  // Cashier
  await prisma.userLocation.create({
    data: {
      userId: cashier.id,
      locationId: restaurant1.id,
    },
  });

  console.log('✅ Usuarios asignados a sedes');

  // Crear categorías
  console.log('📦 Creando categorías...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Bebidas',
        description: 'Bebidas alcohólicas y no alcohólicas',
        businessId: business.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Carnes',
        description: 'Carnes frescas y procesadas',
        businessId: business.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Vegetais',
        description: 'Vegetais frescos',
        businessId: business.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Laticínios',
        description: 'Leite, queijos e derivados',
        businessId: business.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Frutas',
        description: 'Frutas frescas',
        businessId: business.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Pan e Pastelaria',
        description: 'Pães, bolos e pastelaria',
        businessId: business.id,
      },
    }),
  ]);

  console.log('✅ Categorías creadas');

  // Crear productos
  console.log('🛒 Creando productos...');
  const products = await Promise.all([
    // Bebidas
    prisma.product.create({
      data: {
        sku: 'BEB-001',
        name: 'Vinho Tinto Reserva',
        description: 'Vinho tinto de alta qualidade',
        unit: 'GARRAFA',
        minStock: 10,
        maxStock: 100,
        categoryId: categories[0].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEB-002',
        name: 'Cerveja Lager',
        description: 'Cerveja lager nacional',
        unit: 'GARRAFA',
        minStock: 20,
        maxStock: 200,
        categoryId: categories[0].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEB-003',
        name: 'Água Mineral',
        description: 'Água mineral natural',
        unit: 'GARRAFA',
        minStock: 30,
        maxStock: 300,
        categoryId: categories[0].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    // Carnes
    prisma.product.create({
      data: {
        sku: 'CAR-001',
        name: 'Bife de Vaca',
        description: 'Bife de vaca premium',
        unit: 'KG',
        minStock: 5,
        maxStock: 50,
        categoryId: categories[1].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'CAR-002',
        name: 'Frango Inteiro',
        description: 'Frango inteiro fresco',
        unit: 'UNIT',
        minStock: 10,
        maxStock: 100,
        categoryId: categories[1].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    // Vegetais
    prisma.product.create({
      data: {
        sku: 'VEG-001',
        name: 'Tomate',
        description: 'Tomate fresco',
        unit: 'KG',
        minStock: 10,
        maxStock: 100,
        categoryId: categories[2].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'VEG-002',
        name: 'Alface',
        description: 'Alface fresca',
        unit: 'UNIT',
        minStock: 15,
        maxStock: 150,
        categoryId: categories[2].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    // Laticínios
    prisma.product.create({
      data: {
        sku: 'LAT-001',
        name: 'Queijo Serra',
        description: 'Queijo Serra da Estrela',
        unit: 'KG',
        minStock: 5,
        maxStock: 50,
        categoryId: categories[3].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'LAT-002',
        name: 'Leite UHT',
        description: 'Leite UHT integral',
        unit: 'L',
        minStock: 20,
        maxStock: 200,
        categoryId: categories[3].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    // Frutas
    prisma.product.create({
      data: {
        sku: 'FRU-001',
        name: 'Laranja',
        description: 'Laranja fresca',
        unit: 'KG',
        minStock: 15,
        maxStock: 150,
        categoryId: categories[4].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'FRU-002',
        name: 'Maçã',
        description: 'Maçã fresca',
        unit: 'KG',
        minStock: 15,
        maxStock: 150,
        categoryId: categories[4].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    // Pan e Pastelaria
    prisma.product.create({
      data: {
        sku: 'PAN-001',
        name: 'Pão de Forma',
        description: 'Pão de forma integral',
        unit: 'UNIT',
        minStock: 20,
        maxStock: 200,
        categoryId: categories[5].id,
        businessId: business.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'PAN-002',
        name: 'Croissant',
        description: 'Croissant de manteiga',
        unit: 'UNIT',
        minStock: 30,
        maxStock: 300,
        categoryId: categories[5].id,
        businessId: business.id,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Productos creados');

  // Crear inventario inicial
  console.log('📊 Creando inventario inicial...');
  for (const product of products) {
    // Stock en el warehouse
    await prisma.inventory.create({
      data: {
        productId: product.id,
        locationId: warehouse.id,
        quantity: Math.floor(Math.random() * 50) + 20,
      },
    });

    // Stock en restaurante 1
    await prisma.inventory.create({
      data: {
        productId: product.id,
        locationId: restaurant1.id,
        quantity: Math.floor(Math.random() * 20) + 5,
      },
    });

    // Stock en restaurante 2
    await prisma.inventory.create({
      data: {
        productId: product.id,
        locationId: restaurant2.id,
        quantity: Math.floor(Math.random() * 20) + 5,
      },
    });
  }

  console.log('✅ Inventario inicial creado');

  // Crear mesas para restaurantes
  console.log('🪑 Creando mesas...');
  for (let i = 1; i <= 10; i++) {
    await prisma.table.create({
      data: {
        locationId: restaurant1.id,
        number: `${i}`,
        capacity: 4,
        isActive: true,
      },
    });
  }

  for (let i = 1; i <= 8; i++) {
    await prisma.table.create({
      data: {
        locationId: restaurant2.id,
        number: `${i}`,
        capacity: 4,
        isActive: true,
      },
    });
  }

  console.log('✅ Mesas creadas');

  // Crear proveedores
  console.log('🏭 Creando proveedores...');
  await prisma.supplier.create({
    data: {
      name: 'Distribuidora Central Lda',
      vatNumber: '500123456',
      email: 'compras@central.pt',
      phone: '+351 210 987 654',
      address: 'Avenida Central, 200',
      city: 'Lisboa',
      businessId: business.id,
      isActive: true,
    },
  });

  await prisma.supplier.create({
    data: {
      name: 'Produtos Frescos do Sul',
      vatNumber: '500234567',
      email: 'vendas@frescos.pt',
      phone: '+351 289 123 456',
      address: 'Rua do Sul, 50',
      city: 'Faro',
      businessId: business.id,
      isActive: true,
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: 'Vinhos do Douro SA',
      vatNumber: '500345678',
      email: 'encomendas@douro.pt',
      phone: '+351 254 321 654',
      address: 'Estrada do Douro, 300',
      city: 'Porto',
      businessId: business.id,
      isActive: true,
    },
  });

  const supplier4 = await prisma.supplier.create({
    data: {
      name: 'Padaria Alentejana',
      vatNumber: '500456789',
      email: 'padaria@alentejo.pt',
      phone: '+351 266 111 222',
      address: 'Rua do Pão, 10',
      city: 'Évora',
      businessId: business.id,
      isActive: true,
    },
  });

  console.log('✅ Proveedores creados');

  // Crear facturas de compra
  console.log('🧾 Creando facturas de compra...');

  // Factura 1 - Distribuidora Central (PAID)
  const invoice1 = await prisma.purchaseInvoice.create({
    data: {
      number: 'FAC-2026-001',
      supplierId: (await prisma.supplier.findFirst({ where: { vatNumber: '500123456' } }))!.id,
      businessId: business.id,
      issueDate: new Date('2026-04-01'),
      dueDate: new Date('2026-05-01'),
      status: 'PAID',
      notes: 'Compra mensual de carnes y vegetales',
    },
  });

  const inv1Items = await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: invoice1.id, productId: products[3].id, quantity: 20, unitPrice: 12.50, vatRate: 6, totalAmount: 20 * 12.50 * 1.06 },
      { invoiceId: invoice1.id, productId: products[5].id, quantity: 30, unitPrice: 2.80, vatRate: 6, totalAmount: 30 * 2.80 * 1.06 },
      { invoiceId: invoice1.id, productId: products[6].id, quantity: 50, unitPrice: 1.20, vatRate: 6, totalAmount: 50 * 1.20 * 1.06 },
    ],
  });

  await prisma.purchaseInvoice.update({
    where: { id: invoice1.id },
    data: {
      totalAmount: 20 * 12.50 + 30 * 2.80 + 50 * 1.20,
      totalVat: (20 * 12.50 + 30 * 2.80 + 50 * 1.20) * 0.06,
    },
  });

  // Factura 2 - Produtos Frescos do Sul (RECEIVED)
  const invoice2 = await prisma.purchaseInvoice.create({
    data: {
      number: 'FAC-2026-002',
      supplierId: (await prisma.supplier.findFirst({ where: { vatNumber: '500234567' } }))!.id,
      businessId: business.id,
      issueDate: new Date('2026-04-05'),
      dueDate: new Date('2026-05-05'),
      status: 'RECEIVED',
      notes: 'Frutas frescas semanais',
    },
  });

  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: invoice2.id, productId: products[9].id, quantity: 40, unitPrice: 1.50, vatRate: 6, totalAmount: 40 * 1.50 * 1.06 },
      { invoiceId: invoice2.id, productId: products[10].id, quantity: 35, unitPrice: 1.80, vatRate: 6, totalAmount: 35 * 1.80 * 1.06 },
    ],
  });

  await prisma.purchaseInvoice.update({
    where: { id: invoice2.id },
    data: {
      totalAmount: 40 * 1.50 + 35 * 1.80,
      totalVat: (40 * 1.50 + 35 * 1.80) * 0.06,
    },
  });

  // Factura 3 - Vinhos do Douro (DRAFT)
  const invoice3 = await prisma.purchaseInvoice.create({
    data: {
      number: 'FAC-2026-003',
      supplierId: supplier3.id,
      businessId: business.id,
      issueDate: new Date('2026-04-10'),
      dueDate: new Date('2026-05-10'),
      status: 'DRAFT',
      notes: 'Vinhos e cervejas para o mês',
    },
  });

  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: invoice3.id, productId: products[0].id, quantity: 50, unitPrice: 8.90, vatRate: 23, totalAmount: 50 * 8.90 * 1.23 },
      { invoiceId: invoice3.id, productId: products[1].id, quantity: 100, unitPrice: 1.20, vatRate: 23, totalAmount: 100 * 1.20 * 1.23 },
      { invoiceId: invoice3.id, productId: products[2].id, quantity: 200, unitPrice: 0.40, vatRate: 6, totalAmount: 200 * 0.40 * 1.06 },
    ],
  });

  await prisma.purchaseInvoice.update({
    where: { id: invoice3.id },
    data: {
      totalAmount: 50 * 8.90 + 100 * 1.20 + 200 * 0.40,
      totalVat: 50 * 8.90 * 0.23 + 100 * 1.20 * 0.23 + 200 * 0.40 * 0.06,
    },
  });

  // Factura 4 - Padaria (PAID)
  const invoice4 = await prisma.purchaseInvoice.create({
    data: {
      number: 'FAC-2026-004',
      supplierId: supplier4.id,
      businessId: business.id,
      issueDate: new Date('2026-04-08'),
      dueDate: new Date('2026-05-08'),
      status: 'PAID',
    },
  });

  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: invoice4.id, productId: products[11].id, quantity: 80, unitPrice: 1.50, vatRate: 6, totalAmount: 80 * 1.50 * 1.06 },
      { invoiceId: invoice4.id, productId: products[12].id, quantity: 120, unitPrice: 0.80, vatRate: 6, totalAmount: 120 * 0.80 * 1.06 },
    ],
  });

  await prisma.purchaseInvoice.update({
    where: { id: invoice4.id },
    data: {
      totalAmount: 80 * 1.50 + 120 * 0.80,
      totalVat: (80 * 1.50 + 120 * 0.80) * 0.06,
    },
  });

  console.log('✅ Facturas de compra creadas');

  // Crear configuración inicial
  console.log('⚙️ Creando configuración...');
  await prisma.setting.create({
    data: {
      key: 'company_name',
      value: 'Stocker - Sistema de Gestão',
    },
  });

  await prisma.setting.create({
    data: {
      key: 'default_vat_rate',
      value: 'THIRTEEN',
    },
  });

  await prisma.setting.create({
    data: {
      key: 'currency',
      value: 'EUR',
    },
  });

  console.log('✅ Configuración creada');

  // Módulos (catálogo) — sembrados desde el registro de código
  console.log('🧩 Creando catálogo de módulos...');
  const moduleSeed = [
    { key: 'FINANCE', name: 'Finanzas', description: 'Contabilidad, gastos, flujo de caja', status: 'LIVE' },
    { key: 'BI', name: 'BI / Analytics', description: 'Dashboards y reportes avanzados', status: 'LIVE' },
    { key: 'CRM', name: 'CRM', description: 'Clientes, seguimiento, campañas', status: 'LIVE' },
    { key: 'RESTAURANT', name: 'Restaurante', description: 'Mesas, recetas, cocina, reposición', status: 'LIVE' },
    { key: 'WHOLESALE', name: 'Mayorista', description: 'Listas de precios, crédito', status: 'COMING_SOON' },
    { key: 'VARIANTS', name: 'Variantes', description: 'Talla/color/modelo/SKU', status: 'LIVE' },
    { key: 'BATCHES', name: 'Lotes y vencimiento', description: 'Lotes y vencimientos', status: 'COMING_SOON' },
  ];
  for (const m of moduleSeed) {
    await prisma.module.upsert({
      where: { key: m.key },
      update: { name: m.name, description: m.description, status: m.status as any },
      create: { key: m.key, name: m.name, description: m.description, addOnPrice: 0, includedInPlans: [], active: true, status: m.status as any },
    });
  }
  console.log('✅ Catálogo de módulos creado');

  // TenantModule: habilitar RESTAURANT para el negocio demo
  await prisma.tenantModule.upsert({
    where: { businessId_moduleKey: { businessId: business.id, moduleKey: 'RESTAURANT' } },
    update: { enabled: true },
    create: { businessId: business.id, moduleKey: 'RESTAURANT', enabled: true, source: 'PLAN', priceAtActivation: 0 },
  });
  console.log('✅ TenantModule RESTAURANT habilitado para el negocio demo');

  // Precios de plan + suscripciones (Bloque C)
  console.log('💳 Creando precios de plan...');
  const planPrices = [
    { plan: 'STARTER' as const, monthlyPrice: 19.9 },
    { plan: 'GROWTH' as const, monthlyPrice: 49.9 },
    { plan: 'ENTERPRISE' as const, monthlyPrice: 199 },
  ];
  for (const p of planPrices) {
    await prisma.planPrice.upsert({ where: { plan: p.plan }, update: {}, create: { plan: p.plan, monthlyPrice: p.monthlyPrice } });
  }
  const allBiz = await prisma.business.findMany({ select: { id: true } });
  for (const b of allBiz) {
    await prisma.subscription.upsert({ where: { businessId: b.id }, update: {}, create: { businessId: b.id, status: 'EXPIRED' } });
  }
  console.log('✅ Precios de plan + suscripciones creados');

  console.log('🎉 Seed completado con éxito!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('   Admin: admin@stocker.pt / admin123');
  console.log('   Warehouse Manager: warehouse@stocker.pt / manager123');
  console.log('   Restaurant Manager 1: rest1@stocker.pt / manager123');
  console.log('   Restaurant Manager 2: rest2@stocker.pt / manager123');
  console.log('   Cashier: cashier@stocker.pt / cashier123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });