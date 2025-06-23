# Uso Standalone (Sin NestJS)

Esta guía muestra cómo usar `nubi-oam` en aplicaciones Node.js sin NestJS.

## Instalación

```bash
npm install nubi-oam axios
```

## Configuración Básica

```typescript
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  OneToMany,
  ForeignKey,
  OamService 
} from 'nubi-oam';

// Definir entidades
@Entity({ tableName: 'category' })
class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('string')
  name: string;

  @Column('text')
  description: string;

  @OneToMany(() => Product, product => product.category)
  products: Product[];
}

@Entity({ tableName: 'products' })
class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('string')
  name: string;

  @Column('float')
  price: number;

  @Column('int')
  @ForeignKey({
    referencesTable: 'category',
    referencesColumn: 'id',
    onDelete: 'RESTRICT'
  })
  category_id: number;

  @ManyToOne(() => Category, category => category.products)
  category: Category;
}

// Configurar servicio
const oamService = new OamService({
  host: 'localhost',
  port: 8080,
  username: 'admin',
  password: 'secret',
  entities: [Category, Product],
  debug: true
});

// Usar el servicio
async function main() {
  // Verificar conexión
  const isConnected = await oamService.checkConnection();
  console.log('Conectado:', isConnected);

  // Crear tablas individualmente
  const categoryResult = await oamService.createTable(Category);
  console.log('Resultado Category:', categoryResult);

  // Crear todas las tablas (ordenadas automáticamente)
  const results = await oamService.createTables([Product, Category]);
  console.log('Resultados:', results);

  // Obtener payload sin enviar
  const payload = oamService.getTableCreatePayload(Product);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  // Generar comando cURL
  const curl = oamService.generateCurlCommand(Product);
  console.log('cURL:', curl);
}

main().catch(console.error);
```

## Ejemplo con Express.js

```typescript
import express from 'express';
import { OamService } from 'nubi-oam';
import { Category, Product } from './entities';

const app = express();
app.use(express.json());

const oamService = new OamService({
  host: process.env.DATABASE_API_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_API_PORT || '8080'),
  username: process.env.DATABASE_API_USER || 'admin',
  password: process.env.DATABASE_API_PASSWORD || 'secret',
  entities: [Category, Product],
  debug: process.env.NODE_ENV === 'development'
});

// Endpoints
app.get('/health', async (req, res) => {
  const isConnected = await oamService.checkConnection();
  res.json({ 
    status: isConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString()
  });
});

app.post('/tables/:entity/create', async (req, res) => {
  try {
    const { entity } = req.params;
    const entities = { Category, Product };
    const EntityClass = entities[entity as keyof typeof entities];
    
    if (!EntityClass) {
      return res.status(404).json({ error: 'Entidad no encontrada' });
    }

    const result = await oamService.createTable(EntityClass);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tables/create-all', async (req, res) => {
  try {
    const results = await oamService.createTables([Category, Product]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/schema/:entity', (req, res) => {
  try {
    const { entity } = req.params;
    const entities = { Category, Product };
    const EntityClass = entities[entity as keyof typeof entities];
    
    if (!EntityClass) {
      return res.status(404).json({ error: 'Entidad no encontrada' });
    }

    const payload = oamService.getTableCreatePayload(EntityClass);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});
```

## Configuración Avanzada

```typescript
const oamService = new OamService({
  host: 'https://api.example.com',
  username: 'admin',
  password: 'secret',
  apiVersion: 'v2',
  apiPrefix: 'database',
  timeout: 15000,
  debug: true,
  entities: [Category, Product],
  autoSortEntities: true,
  headers: {
    'X-API-Key': 'your-api-key',
    'X-Client': 'my-app-v1.0',
    'Accept': 'application/json'
  }
});
```

## Variables de Entorno

Crea un archivo `.env`:

```bash
DATABASE_API_HOST=localhost
DATABASE_API_PORT=8080
DATABASE_API_USER=admin
DATABASE_API_PASSWORD=secret
DATABASE_API_VERSION=v2
NODE_ENV=development
API_KEY=your-secret-key
```

Y úsalo en tu aplicación:

```typescript
import dotenv from 'dotenv';
dotenv.config();

const oamService = new OamService({
  host: process.env.DATABASE_API_HOST!,
  port: process.env.DATABASE_API_PORT ? parseInt(process.env.DATABASE_API_PORT) : undefined,
  username: process.env.DATABASE_API_USER!,
  password: process.env.DATABASE_API_PASSWORD!,
  apiVersion: process.env.DATABASE_API_VERSION,
  debug: process.env.NODE_ENV === 'development',
  entities: [Category, Product],
  headers: {
    'X-API-Key': process.env.API_KEY
  }
});
```

## Decoradores Disponibles

### @Entity
```typescript
// Básico
@Entity()
class User {}

// Con opciones
@Entity({ 
  tableName: 'usuarios',
  name: 'UserEntity'
})
class User {}
```

### @Column
```typescript
class Product {
  // Inferencia automática de tipo
  @Column()
  name: string;

  // Tipo específico
  @Column('text')
  description: string;

  // Con opciones completas
  @Column({
    type: 'string',
    nullable: false,
    unique: true,
    length: 255,
    default: 'Sin nombre',
    comment: 'Nombre del producto'
  })
  name: string;
}
```

### @PrimaryGeneratedColumn
```typescript
class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Con opciones
  @PrimaryGeneratedColumn({ 
    name: 'user_id',
    type: 'integer'
  })
  id: number;
}
```

### @ForeignKey
```typescript
class Product {
  @Column('int')
  @ForeignKey({
    referencesTable: 'category',
    referencesColumn: 'id',
    onDelete: 'CASCADE',    // RESTRICT, SET NULL, NO ACTION
    onUpdate: 'CASCADE'     // RESTRICT, SET NULL, NO ACTION
  })
  category_id: number;
}
```

### Relaciones
```typescript
// @OneToMany
@OneToMany(() => Product, product => product.category, {
  cascade: true,
  eager: false
})
products: Product[];

// @ManyToOne
@ManyToOne(() => Category, category => category.products, {
  cascade: false,
  eager: true,
  joinColumn: 'category_id'
})
category: Category;

// @OneToOne
@OneToOne(() => Profile, profile => profile.user, {
  cascade: true,
  joinColumn: 'profile_id'
})
profile: Profile;
```

## Manejo de Errores

```typescript
import { OamService } from 'nubi-oam';

const oamService = new OamService({
  host: 'localhost',
  port: 8080,
  username: 'admin',
  password: 'secret',
  debug: true
});

async function handleErrors() {
  try {
    // Verificar conexión
    const isConnected = await oamService.checkConnection();
    if (!isConnected) {
      throw new Error('No se puede conectar a la API de base de datos');
    }

    // Crear tabla con manejo de errores
    const result = await oamService.createTable(Product);
    
    if (!result.success) {
      console.error(`Error creando tabla ${result.tableName}:`, result.error);
      // Manejar error específico
      if (result.error?.includes('already exists')) {
        console.log('La tabla ya existe, continuando...');
      } else {
        throw new Error(result.error);
      }
    }

  } catch (error) {
    console.error('Error general:', error.message);
    
    // Reintentar con backoff
    await new Promise(resolve => setTimeout(resolve, 2000));
    // ... lógica de reintento
  }
}
```

## Scripts Útiles

### Script de Inicialización
```typescript
// scripts/init-database.ts
import { OamService } from 'nubi-oam';
import { Category, Product, User } from '../entities';

const oamService = new OamService({
  host: process.env.DATABASE_API_HOST!,
  port: parseInt(process.env.DATABASE_API_PORT!),
  username: process.env.DATABASE_API_USER!,
  password: process.env.DATABASE_API_PASSWORD!,
  entities: [Category, Product, User],
  debug: true
});

async function initDatabase() {
  console.log('🚀 Iniciando creación de base de datos...');
  
  try {
    // Verificar conexión
    const isConnected = await oamService.checkConnection();
    if (!isConnected) {
      throw new Error('No se puede conectar a la API');
    }
    console.log('✅ Conexión exitosa');

    // Crear todas las tablas
    const results = await oamService.createTables([Category, Product, User]);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ ${successful.length} tablas creadas exitosamente`);
    
    if (failed.length > 0) {
      console.log(`❌ ${failed.length} tablas fallaron:`);
      failed.forEach(f => console.log(`  - ${f.tableName}: ${f.error}`));
    }
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  initDatabase();
}
```

Ejecutar con:
```bash
npx ts-node scripts/init-database.ts
```

## Testing

```typescript
// test/oam.test.ts
import { OamService } from 'nubi-oam';
import { Category, Product } from '../entities';

describe('OAM Service', () => {
  let oamService: OamService;

  beforeEach(() => {
    oamService = new OamService({
      host: 'localhost',
      port: 8080,
      username: 'test',
      password: 'test',
      entities: [Category, Product],
      debug: false
    });
  });

  describe('Connection', () => {
    it('should check connection', async () => {
      // Mock axios para testing
      jest.spyOn(oamService as any, 'httpClient').mockImplementation({
        get: jest.fn().mockResolvedValue({ status: 200 })
      });

      const result = await oamService.checkConnection();
      expect(result).toBe(true);
    });
  });

  describe('Table Creation', () => {
    it('should generate correct payload for Category', () => {
      const payload = oamService.getTableCreatePayload(Category);
      
      expect(payload.columns).toBeDefined();
      expect(payload.columns.some(col => col.name === 'id')).toBe(true);
      expect(payload.columns.some(col => col.name === 'name')).toBe(true);
    });
  });
});
```

## Troubleshooting

### Problemas Comunes

1. **Error de conexión**
```typescript
// Verificar que la URL y puerto sean correctos
const isConnected = await oamService.checkConnection();
if (!isConnected) {
  console.log('Verificar que la API esté corriendo en:', 
              oamService.getConnectionOptions().host);
}
```

2. **Dependencias circulares**
```typescript
// Usar importaciones diferidas
@Entity()
class User {
  @OneToMany(() => Order, order => order.user)  // OK
  orders: Order[];
}

@Entity() 
class Order {
  @ManyToOne(() => User, user => user.orders)   // OK
  user: User;
}
```

3. **Configuración TypeScript**
```typescript
// tsconfig.json - Asegurar configuración correcta
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // ... otras opciones
  }
}

// main.ts - Importar reflect-metadata al inicio
import 'reflect-metadata';
``` 