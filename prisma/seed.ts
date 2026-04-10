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
      isActive: true,
      maxRestaurants: 10,
      maxUsers: 20,
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
      phone: '+351 912 345 678',
      language: 'pt-PT',
      isActive: true,
    },
  });

  const warehouseManager = await prisma.user.create({
    data: {
      email: 'warehouse@stocker.pt',
      name: 'João Silva',
      password: await bcrypt.hash('manager123', 10),
      phone: '+351 923 456 789',
      language: 'pt-PT',
      isActive: true,
    },
  });

  const restaurantManager1 = await prisma.user.create({
    data: {
      email: 'rest1@stocker.pt',
      name: 'Maria Santos',
      password: await bcrypt.hash('manager123', 10),
      phone: '+351 934 567 890',
      language: 'pt-PT',
      isActive: true,
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
      isActive: true,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      email: 'cashier@stocker.pt',
      name: 'Ana Ferreira',
      password: await bcrypt.hash('cashier123', 10),
      phone: '+351 956 789 012',
      language: 'pt-PT',
      isActive: true,
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
      slug: 'warehouse',
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
      slug: 'chiado',
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
      slug: 'bairro-alto',
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
      role: 'WAREHOUSE_MANAGER',
      isPrimary: true,
    },
  });

  // Warehouse Manager
  await prisma.userLocation.create({
    data: {
      userId: warehouseManager.id,
      locationId: warehouse.id,
      role: 'WAREHOUSE_MANAGER',
      isPrimary: true,
    },
  });

  // Restaurant Manager 1
  await prisma.userLocation.create({
    data: {
      userId: restaurantManager1.id,
      locationId: restaurant1.id,
      role: 'RESTAURANT_MANAGER',
      isPrimary: true,
    },
  });

  // Restaurant Manager 2
  await prisma.userLocation.create({
    data: {
      userId: restaurantManager2.id,
      locationId: restaurant2.id,
      role: 'RESTAURANT_MANAGER',
      isPrimary: true,
    },
  });

  // Cashier
  await prisma.userLocation.create({
    data: {
      userId: cashier.id,
      locationId: restaurant1.id,
      role: 'CASHIER',
      isPrimary: true,
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
        avgCost: Math.floor(Math.random() * 10) + 5,
        minLevel: product.minStock,
        maxLevel: product.maxStock || null,
      },
    });

    // Stock en restaurante 1
    await prisma.inventory.create({
      data: {
        productId: product.id,
        locationId: restaurant1.id,
        quantity: Math.floor(Math.random() * 20) + 5,
        avgCost: Math.floor(Math.random() * 10) + 5,
        minLevel: Math.floor(product.minStock / 2),
        maxLevel: product.maxStock ? Math.floor(product.maxStock / 2) : null,
      },
    });

    // Stock en restaurante 2
    await prisma.inventory.create({
      data: {
        productId: product.id,
        locationId: restaurant2.id,
        quantity: Math.floor(Math.random() * 20) + 5,
        avgCost: Math.floor(Math.random() * 10) + 5,
        minLevel: Math.floor(product.minStock / 2),
        maxLevel: product.maxStock ? Math.floor(product.maxStock / 2) : null,
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

  console.log('✅ Proveedores creados');

  // Crear configuración inicial
  console.log('⚙️ Creando configuración...');
  await prisma.setting.create({
    data: {
      key: 'company_name',
      value: 'Stocker - Sistema de Gestão',
      description: 'Nome da empresa',
    },
  });

  await prisma.setting.create({
    data: {
      key: 'default_vat_rate',
      value: 'THIRTEEN',
      description: 'Taxa de IVA padrão (13% - restaurantes)',
    },
  });

  await prisma.setting.create({
    data: {
      key: 'currency',
      value: 'EUR',
      description: 'Moeda do sistema',
    },
  });

  console.log('✅ Configuración creada');

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