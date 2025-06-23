# Nubi OAM - Object API Management

Una librería de TypeScript que proporciona decoradores similares a TypeORM para gestionar entidades y generar automáticamente llamadas API para la creación de tablas en bases de datos.

## Características

- 🎯 **Decoradores intuitivos** - Sintaxis familiar similar a TypeORM
- 🔗 **Gestión de relaciones** - Soporte para OneToOne, OneToMany, ManyToOne
- 🚀 **Generación automática de API** - Crea comandos cURL y payloads JSON automáticamente
- 📊 **Análisis de dependencias** - Ordena automáticamente las entidades según sus dependencias
- 🛡️ **TypeScript nativo** - Soporte completo para tipos y metadatos

## Instalación

```bash
npm install nubi-oam
```

**Para NestJS:**
```bash
npm install nubi-oam @nestjs/common @nestjs/core rxjs
```

## Uso con NestJS (Recomendado)

### 1. Configuración en AppModule

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OamModule } from 'nubi-oam';
import { Category } from './entities/Category';
import { Product } from './entities/Product';

@Module({
  imports: [
    // Configuración básica
    OamModule.forRoot({
      host: 'localhost',
      port: 8080,
      username: 'admin',
      password: 'secret',
      entities: [Category, Product],
      autoCreateTables: true,
      debug: true
    }),

    // O configuración asíncrona con variables de entorno
    OamModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        host: configService.get('DATABASE_API_HOST'),
        port: configService.get('DATABASE_API_PORT'),
        username: configService.get('DATABASE_API_USER'),
        password: configService.get('DATABASE_API_PASSWORD'),
        entities: [Category, Product],
        autoCreateTables: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. Usar en Servicios

```typescript
import { Injectable } from '@nestjs/common';
import { OamService } from 'nubi-oam';

@Injectable()
export class AppService {
  constructor(private readonly oamService: OamService) {}

  async createTable() {
    const result = await this.oamService.createTable(Category);
    return result;
  }

  async createAllTables() {
    const results = await this.oamService.createTables([Category, Product]);
    return results;
  }

  async healthCheck() {
    const isConnected = await this.oamService.checkConnection();
    return { status: isConnected ? 'ok' : 'error' };
  }
}
```

## Uso Básico (Standalone)

### 1. Definir Entidades

```typescript
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, ForeignKey } from 'nubi-oam';

// Entidad Category
@Entity({ tableName: 'category' })
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('string')
  name: string;

  @Column('text')
  description: string;

  @Column('datetime')
  created_at: Date;

  @OneToMany(() => Product, product => product.category)
  products: Product[];
}

// Entidad Product con relación
@Entity({ tableName: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('string')
  name: string;

  @Column('text')
  description: string;

  @Column('float')
  price: number;

  @Column('int')
  stock: number;

  @Column('int')
  @ForeignKey({
    referencesTable: 'category',
    referencesColumn: 'id',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  })
  category_id: number;

  @ManyToOne(() => Category, category => category.products)
  category: Category;
}
```

### 2. Generar Schemas y API Calls

```typescript
import { SchemaBuilder } from 'nubi-oam';

const schemaBuilder = new SchemaBuilder();

// Generar payload JSON para crear tabla
const categoryPayload = schemaBuilder.buildTableCreateRequest(Category);
console.log(JSON.stringify(categoryPayload, null, 2));

// Generar comando cURL completo
const categoryCurl = schemaBuilder.generateCurlCommand(Category, 'http://localhost:8080');
console.log(categoryCurl);

// Analizar dependencias y ordenar entidades
const entities = [Product, Category];
const sortedEntities = schemaBuilder.sortEntitiesByDependencies(entities);
console.log('Orden de creación:', sortedEntities.map(e => e.name));
```

### Salida de Ejemplo

#### Payload JSON generado:
```json
{
  "columns": [
    {"name": "id", "type": "int", "required": true, "unique": true},
    {"name": "name", "type": "string", "required": true},
    {"name": "description", "type": "text"},
    {"name": "created_at", "type": "datetime"}
  ]
}
```

#### Comando cURL generado:
```bash
curl -X POST http://localhost:8080/api/v2/tables/category/create \
  -H "Content-Type: application/json" \
  -d '{
  "columns": [
    {"name": "id", "type": "int", "required": true, "unique": true},
    {"name": "name", "type": "string", "required": true},
    {"name": "description", "type": "text"},
    {"name": "created_at", "type": "datetime"}
  ]
}'
```

## API de Decoradores

### @Entity(options?)
Marca una clase como entidad de base de datos.

```typescript
@Entity({ tableName: 'custom_table_name' })
class MyEntity {}
```

### @Column(type?, options?)
Define una columna en la tabla.

```typescript
@Column('string', { nullable: false, unique: true })
name: string;

@Column({ type: 'int', default: 0 })
count: number;
```

### @PrimaryGeneratedColumn(options?)
Define una columna primaria auto-generada.

```typescript
@PrimaryGeneratedColumn()
id: number;
```

### @ForeignKey(options)
Define una clave foránea.

```typescript
@ForeignKey({
  referencesTable: 'category',
  referencesColumn: 'id',
  onDelete: 'CASCADE',
  onUpdate: 'RESTRICT'
})
category_id: number;
```

### Decoradores de Relaciones

```typescript
// Uno a uno
@OneToOne(() => Profile, profile => profile.user)
profile: Profile;

// Uno a muchos
@OneToMany(() => Product, product => product.category)
products: Product[];

// Muchos a uno
@ManyToOne(() => Category, category => category.products)
category: Category;
```

## Tipos de Columna Soportados

- `'string'` - Texto corto
- `'text'` - Texto largo
- `'int'` / `'integer'` - Números enteros
- `'float'` / `'double'` - Números decimales
- `'boolean'` - Valores booleanos
- `'date'` - Fechas
- `'datetime'` - Fecha y hora
- `'timestamp'` - Timestamp
- `'json'` - Datos JSON

## Opciones de Configuración

### OamConnectionOptions

```typescript
interface OamConnectionOptions {
  host: string;                    // URL de la API (requerido)
  port?: number;                   // Puerto opcional
  username: string;                // Usuario (requerido)
  password: string;                // Contraseña (requerido)
  apiVersion?: string;             // Versión API (default: 'v2')
  apiPrefix?: string;              // Prefijo API (default: 'api')
  timeout?: number;                // Timeout en ms (default: 5000)
  debug?: boolean;                 // Logs de debug (default: false)
  entities?: Function[];           // Entidades a registrar
  autoCreateTables?: boolean;      // Auto-crear al iniciar (default: false)
  autoSortEntities?: boolean;      // Ordenar por dependencias (default: true)
  headers?: Record<string, string>; // Headers adicionales
}
```

### Variables de Entorno (Ejemplo)

```bash
DATABASE_API_HOST=localhost
DATABASE_API_PORT=8080
DATABASE_API_USER=admin
DATABASE_API_PASSWORD=secret
DATABASE_API_VERSION=v2
AUTO_CREATE_TABLES=true
API_KEY=your-api-key
NODE_ENV=development
```

## Configuración TypeScript

Asegúrate de tener la siguiente configuración en tu `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Compilar
npm run build

# Ejecutar tests
npm test

# Desarrollo con watch
npm run dev
```

## Compatibilidad con APIs

Esta librería está diseñada para trabajar con APIs que siguen el patrón:

```
POST /api/v2/tables/{tableName}/create
```

Con payloads en formato:

```json
{
  "columns": [...],
  "foreign_keys": [...]
}
```

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

ISC License 