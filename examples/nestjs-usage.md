# Uso con NestJS

Esta guía muestra cómo usar `nubi-oam` en aplicaciones NestJS.

## Instalación

```bash
npm install nubi-oam @nestjs/common @nestjs/core @nestjs/config axios rxjs
```

## 1. Configuración en AppModule

### Configuración Básica

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { OamModule } from 'nubi-oam';
import { Category } from './entities/Category';
import { Product } from './entities/Product';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    OamModule.forRoot({
      host: 'localhost',
      port: 8080,
      username: 'admin',
      password: 'secret',
      entities: [Category, Product],
      autoCreateTables: true,
      debug: true,
      timeout: 10000,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Configuración Asíncrona con Variables de Entorno

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OamModule } from 'nubi-oam';
import { Category } from './entities/Category';
import { Product } from './entities/Product';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    OamModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        host: configService.get('DATABASE_API_HOST', 'localhost'),
        port: configService.get('DATABASE_API_PORT', 8080),
        username: configService.get('DATABASE_API_USER', 'admin'),
        password: configService.get('DATABASE_API_PASSWORD', 'secret'),
        apiVersion: configService.get('DATABASE_API_VERSION', 'v2'),
        debug: configService.get('NODE_ENV') === 'development',
        entities: [Category, Product],
        autoCreateTables: configService.get('AUTO_CREATE_TABLES', 'false') === 'true',
        timeout: 15000,
        headers: {
          'X-API-Key': configService.get('API_KEY'),
          'X-Environment': configService.get('NODE_ENV', 'development')
        }
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Configuración con Factory Class

```typescript
// config/oam-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OamOptionsFactory, OamConnectionOptions } from 'nubi-oam';
import { Category, Product } from '../entities';

@Injectable()
export class OamConfigService implements OamOptionsFactory {
  constructor(private configService: ConfigService) {}

  createOamOptions(): OamConnectionOptions {
    return {
      host: this.configService.get('DATABASE_API_HOST', 'localhost'),
      port: this.configService.get('DATABASE_API_PORT', 8080),
      username: this.configService.get('DATABASE_API_USER', 'admin'),
      password: this.configService.get('DATABASE_API_PASSWORD', 'secret'),
      entities: [Category, Product],
      autoCreateTables: this.configService.get('AUTO_CREATE_TABLES', 'false') === 'true',
      debug: this.configService.get('NODE_ENV') === 'development',
    };
  }
}

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    OamModule.forRootAsync({
      imports: [ConfigModule],
      useClass: OamConfigService,
    }),
  ],
  // ...
})
export class AppModule {}
```

## 2. Definir Entidades

```typescript
// entities/Category.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'nubi-oam';
import { Product } from './Product';

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

// entities/Product.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, ForeignKey } from 'nubi-oam';
import { Category } from './Category';

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

## 3. Usar en Servicios

```typescript
// app.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { OamService } from 'nubi-oam';
import { Category } from './entities/Category';
import { Product } from './entities/Product';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly oamService: OamService) {}

  async onModuleInit() {
    const isConnected = await this.oamService.checkConnection();
    console.log(`🔗 Conexión a Database API: ${isConnected ? 'Exitosa' : 'Fallida'}`);
  }

  async createCategoryTable() {
    return await this.oamService.createTable(Category);
  }

  async createAllTables() {
    const results = await this.oamService.createTables([Category, Product]);
    
    return {
      success: results.every(r => r.success),
      totalTables: results.length,
      results: results.map(r => ({
        table: r.tableName,
        success: r.success,
        message: r.message || r.error
      }))
    };
  }

  getTableSchema(entityName: string) {
    const entities = { Category, Product };
    const EntityClass = entities[entityName as keyof typeof entities];
    
    if (!EntityClass) {
      throw new Error(`Entidad ${entityName} no encontrada`);
    }
    
    return this.oamService.getTableCreatePayload(EntityClass);
  }

  async healthCheck() {
    const isConnected = await this.oamService.checkConnection();
    const connectionInfo = this.oamService.getConnectionOptions();
    
    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      connection: {
        host: connectionInfo.host,
        port: connectionInfo.port,
        apiVersion: connectionInfo.apiVersion,
      }
    };
  }
}
```

## 4. Crear Controladores

```typescript
// app.controller.ts
import { Controller, Get, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async healthCheck() {
    return await this.appService.healthCheck();
  }

  @Post('tables/:entity/create')
  async createTable(@Param('entity') entity: string) {
    try {
      if (entity === 'category') {
        return await this.appService.createCategoryTable();
      }
      throw new HttpException('Entidad no encontrada', HttpStatus.NOT_FOUND);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('tables/create-all')
  async createAllTables() {
    return await this.appService.createAllTables();
  }

  @Get('schema/:entity')
  getTableSchema(@Param('entity') entity: string) {
    try {
      return this.appService.getTableSchema(entity);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }
}
```

## 5. Variables de Entorno

Crea un archivo `.env`:

```bash
DATABASE_API_HOST=localhost
DATABASE_API_PORT=8080
DATABASE_API_USER=admin
DATABASE_API_PASSWORD=secret
DATABASE_API_VERSION=v2
AUTO_CREATE_TABLES=true
NODE_ENV=development
API_KEY=your-secret-api-key
```

## 6. Configuración con Feature Modules

Para proyectos grandes, puedes usar feature modules:

```typescript
// modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { OamModule } from 'nubi-oam';
import { Product } from './entities/Product';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  imports: [
    OamModule.forFeature([Product])
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
```

## 7. Testing

```typescript
// app.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OamService } from 'nubi-oam';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let oamService: OamService;

  beforeEach(async () => {
    const mockOamService = {
      checkConnection: jest.fn().mockResolvedValue(true),
      createTable: jest.fn().mockResolvedValue({ success: true, tableName: 'test' }),
      createTables: jest.fn().mockResolvedValue([{ success: true, tableName: 'test' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: OamService,
          useValue: mockOamService,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    oamService = module.get<OamService>(OamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should check connection on module init', async () => {
    await service.onModuleInit();
    expect(oamService.checkConnection).toHaveBeenCalled();
  });
});
```

## Ventajas del Uso con NestJS

1. **Inyección de Dependencias**: OamService está disponible en toda la aplicación
2. **Configuración Centralizada**: Un solo lugar para configurar la conexión
3. **Auto-creación**: Las tablas se crean automáticamente al iniciar la aplicación
4. **Health Checks**: Verificación automática de conexión
5. **Logging Integrado**: Usa el sistema de logging de NestJS
6. **Testing Fácil**: Mock del servicio para testing unitario 