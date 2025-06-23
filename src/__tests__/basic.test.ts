import "reflect-metadata";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ForeignKey,
  SchemaBuilder,
  MetadataStorage,
} from "../index";

// Entidades de prueba
@Entity({ tableName: "category" })
class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("string")
  name!: string;

  @Column("text")
  description!: string;

  @OneToMany(() => Product, (product: any) => product.category)
  products!: Product[];
}

@Entity({ tableName: "products" })
class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("string")
  name!: string;

  @Column("float")
  price!: number;

  @Column("int")
  @ForeignKey({
    referencesTable: "category",
    referencesColumn: "id",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  category_id!: number;

  @ManyToOne(() => Category, (category: any) => category.products)
  category!: Category;
}

describe("Nubi OAM Library", () => {
  let schemaBuilder: SchemaBuilder;
  let metadataStorage: MetadataStorage;

  beforeEach(() => {
    schemaBuilder = new SchemaBuilder();
    metadataStorage = MetadataStorage.getInstance();
  });

  afterEach(() => {
    metadataStorage.clear();
  });

  describe("Entity Metadata", () => {
    it("should store entity metadata correctly", () => {
      const categoryMetadata = metadataStorage.getEntityMetadata(Category);

      expect(categoryMetadata).toBeDefined();
      expect(categoryMetadata?.name).toBe("Category");
      expect(categoryMetadata?.tableName).toBe("category");
    });

    it("should store column metadata correctly", () => {
      const categoryMetadata = metadataStorage.getEntityMetadata(Category);

      expect(categoryMetadata?.columns.has("id")).toBe(true);
      expect(categoryMetadata?.columns.has("name")).toBe(true);
      expect(categoryMetadata?.columns.has("description")).toBe(true);

      const idColumn = categoryMetadata?.columns.get("id");
      expect(idColumn?.type).toBe("int");
      expect(idColumn?.required).toBe(true);

      const nameColumn = categoryMetadata?.columns.get("name");
      expect(nameColumn?.type).toBe("string");
    });

    it("should store foreign key metadata correctly", () => {
      const productMetadata = metadataStorage.getEntityMetadata(Product);

      expect(productMetadata?.foreignKeys).toBeDefined();
      expect(productMetadata?.foreignKeys.length).toBe(1);

      const fk = productMetadata?.foreignKeys[0];
      expect(fk?.column).toBe("category_id");
      expect(fk?.referencesTable).toBe("category");
      expect(fk?.referencesColumn).toBe("id");
      expect(fk?.onDelete).toBe("RESTRICT");
      expect(fk?.onUpdate).toBe("CASCADE");
    });
  });

  describe("Schema Builder", () => {
    it("should generate table create request for Category", () => {
      const request = schemaBuilder.buildTableCreateRequest(Category);

      expect(request.columns).toBeDefined();
      expect(request.columns.length).toBeGreaterThan(0);

      const idColumn = request.columns.find((col) => col.name === "id");
      expect(idColumn).toBeDefined();
      expect(idColumn?.type).toBe("int");
      expect(idColumn?.required).toBe(true);

      const nameColumn = request.columns.find((col) => col.name === "name");
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.type).toBe("string");
    });

    it("should generate table create request for Product with foreign keys", () => {
      const request = schemaBuilder.buildTableCreateRequest(Product);

      expect(request.columns).toBeDefined();
      expect(request.foreign_keys).toBeDefined();
      expect(request.foreign_keys?.length).toBe(1);

      const fk = request.foreign_keys?.[0];
      expect(fk?.column).toBe("category_id");
      expect(fk?.references_table).toBe("category");
      expect(fk?.references_column).toBe("id");
    });

    it("should generate cURL command correctly", () => {
      const curl = schemaBuilder.generateCurlCommand(
        Category,
        "http://localhost:8080"
      );

      expect(curl).toContain("curl -X POST");
      expect(curl).toContain(
        "http://localhost:8080/api/v2/tables/category/create"
      );
      expect(curl).toContain("Content-Type: application/json");
      expect(curl).toContain('"columns"');
    });

    it("should sort entities by dependencies", () => {
      const entities = [Product, Category];
      const sorted = schemaBuilder.sortEntitiesByDependencies(entities);

      // Category debe venir antes que Product (Product depende de Category)
      const categoryIndex = sorted.indexOf(Category);
      const productIndex = sorted.indexOf(Product);

      expect(categoryIndex).toBeLessThan(productIndex);
    });

    it("should validate dependencies correctly", () => {
      const entitiesWithAllDeps = [Product, Category];
      const validationWithDeps =
        schemaBuilder.validateDependencies(entitiesWithAllDeps);
      expect(validationWithDeps.valid).toBe(true);
      expect(validationWithDeps.errors.length).toBe(0);

      const entitiesWithMissingDeps = [Product]; // Falta Category
      const validationWithoutDeps = schemaBuilder.validateDependencies(
        entitiesWithMissingDeps
      );
      expect(validationWithoutDeps.valid).toBe(false);
      expect(validationWithoutDeps.errors.length).toBeGreaterThan(0);
    });
  });
});
