# 🏪 Stocker - Backend Base

Sistema de gestión de inventario y POS para cadenas de restaurantes en Portugal.

## 🚀 Stack Tecnológico

- **Next.js 14** - Framework React con App Router
- **Prisma ORM** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos
- **NextAuth.js** - Autenticación
- **TypeScript** - Tipado estático
- **Zod** - Validación de datos
- **Tailwind CSS** - Estilos

## 📋 Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## 🔧 Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Editar `.env` con tus credenciales de PostgreSQL.

3. **Generar cliente Prisma:**
   ```bash
   npm run db:generate
   ```

4. **Sincronizar base de datos:**
   ```bash
   npm run db:push
   ```

5. **Ejecutar seed (datos de prueba):**
   ```bash
   npm run db:seed
   ```

## 🎯 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Ejecutar ESLint
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar schema con DB
npm run db:seed      # Poblar DB con datos de prueba
npm run db:studio    # Abrir Prisma Studio
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/[...nextauth]` - Login/Logout (NextAuth)

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/[id]` - Obtener usuario
- `PUT /api/users/[id]` - Actualizar usuario
- `DELETE /api/users/[id]` - Desactivar usuario

### Sedes (Locations)
- `GET /api/locations` - Listar sedes
- `POST /api/locations` - Crear sede
- `GET /api/locations/[id]` - Obtener sede
- `PUT /api/locations/[id]` - Actualizar sede
- `DELETE /api/locations/[id]` - Desactivar sede

## 👥 Usuarios de Prueba (Seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@stocker.pt | admin123 |
| Warehouse Manager | warehouse@stocker.pt | manager123 |
| Restaurant Manager 1 | rest1@stocker.pt | manager123 |
| Restaurant Manager 2 | rest2@stocker.pt | manager123 |
| Cashier | cashier@stocker.pt | cashier123 |

## 📊 Estructura del Proyecto

```
stocker/
├── prisma/
│   ├── schema.prisma      # Schema de base de datos
│   └── seed.ts            # Datos de prueba
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── users/route.ts
│   │   │   └── locations/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/
│       ├── prisma.ts      # Cliente Prisma
│       └── auth.ts        # Configuración NextAuth
├── types/
│   └── next-auth.d.ts     # Tipos NextAuth
├── .env.example
├── .env
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🔐 Roles de Usuario

- `ADMIN` - Acceso total al sistema
- `WAREHOUSE_MANAGER` - Gestión del depósito
- `RESTAURANT_MANAGER` - Gestión de restaurante
- `CASHIER` - Solo POS
- `VIEWER` - Solo lectura

## 📝 Notas Importantes

- **Validación:** Todos los endpoints usan Zod para validación de inputs
- **Seguridad:** Contraseñas hasheadas con bcryptjs
- **Soft Delete:** Usuarios y sedes se desactivan en lugar de eliminarse
- **TypeScript:** Tipado estricto habilitado

## 🚀 Próximos Pasos

- [ ] Implementar middleware de autenticación
- [ ] Crear APIs de inventario
- [ ] Implementar transferencias entre sedes
- [ ] Crear APIs de POS (órdenes, pagos)
- [ ] Implementar facturación
- [ ] Agregar tests

## 📄 Licencia

ISC