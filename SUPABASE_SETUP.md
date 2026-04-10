# Configuración de Supabase para Stocker

## Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta (si no tienes)
3. Click en "New Project"
4. Nombre: `stocker`
5. Password: **Guarda esta contraseña**
6. Region: Europe West (más cerca de Portugal)
7. Click "Create new project"

## Paso 2: Obtener credenciales

Una vez creado el proyecto:

1. Ve a **Settings** → **API**
2. Copia estos valores:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Ve a **Settings** → **Database**
4. Copia la **Connection string** (URI format)
   - Reemplaza `[YOUR-PASSWORD]` con tu contraseña
   - Ese es tu `DATABASE_URL`

## Paso 3: Configurar .env

Crea el archivo `.env.local` en la raíz del proyecto:

```env
# Database
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

# NextAuth
NEXTAUTH_SECRET="genera-uno-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Supabase (opcional, para features extra)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[TU-ANON-KEY]"
```

## Paso 4: Ejecutar migraciones

```bash
cd /home/fabriziodp/.openclaw/workspace/stocker

# Generar cliente Prisma
npx prisma generate

# Crear migraciones
npx prisma migrate dev --name init

# Cargar datos de prueba
npx prisma db seed

# Iniciar desarrollo
npm run dev
```

## Paso 5: Verificar

Abre [http://localhost:3000](http://localhost:3000)

Deberías ver:
- Página de login
- Opción de registro
- Dashboard después de loguearte

## Datos de prueba (seed)

El seed crea:
- **Admin:** admin@stocker.com / admin123
- **1 Depósito:** Depósito Principal (Lisboa)
- **2 Restaurantes:** Restaurante Centro, Restaurante Norte
- **5 Categorías:** Carnes, Pescados, Vegetales, Lácteos, Bebidas
- **20 Productos** de ejemplo

## Troubleshooting

### Error de conexión SSL
Agrega `?sslmode=require` al final de DATABASE_URL

### Error de pooler
Usa la conexión directa (puerto 5432) para migraciones:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Prisma no conecta
Verifica que la contraseña no tenga caracteres especiales sin escapar.

---

¿Necesitas ayuda con algún paso?