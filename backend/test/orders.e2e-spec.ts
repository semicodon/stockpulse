import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import {AppModule} from "../src/app.module.js";
import {createTestScenario, resetDatabase} from "./helpers/seed-factory.js";
import {PrismaService} from "../src/prisma/prisma.service.js";
import {API_ORDERS, API_ORDERS_SUMMARY, API_PRODUCTS} from "./helpers/constants.js";


describe('Orders & Inventory Fulfillment (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        try {
            // Respect CI environment variable if set; otherwise default to local Docker db-test on 127.0.0.1:5433
            process.env.DATABASE_URL =
              process.env.DATABASE_URL ||
              'postgresql://postgres:postgrespassword@127.0.0.1:5433/stockpulse_test?schema=public';

            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [AppModule],
            }).compile();

            app = moduleFixture.createNestApplication();
            app.useGlobalPipes(
                new ValidationPipe({
                    whitelist: true,
                    forbidNonWhitelisted: true,
                    transform: true,
                }),
            );

            prisma = app.get<PrismaService>(PrismaService);
            await app.init();
        } catch (error) {
            console.error('E2E beforeAll initialization failed:', error);
            throw error;
        }
    });

    beforeEach(async () => {
        if (prisma) {
            await resetDatabase(prisma);
        }
    });

    afterAll(async () => {
        if (prisma) {
            await resetDatabase(prisma);
        }
        if (app) {
            await app.close();
        }
    });

    it(`POST ${API_ORDERS} -> fulfills a valid order and decrements stock atomically`, async () => {
        const stockQuantity = 10
        const price = 150.0
        const quantity = 4
        const expectedRequestStatus = 201
        const expectedBodyStatus = 'FULFILLED'
        const expectedBodyItemsCount = 1
        const expectedBodyUnitPrice = 150.0
        const expectedStockQuantity = 6

        const { customer, product } = await createTestScenario(prisma, {
            stockQuantity,
            price,
        });

        const response = await request(app.getHttpServer())
            .post(`${API_ORDERS}`)
            .send({
                customerId: customer.id,
                items: [{ productId: product.id, quantity }],
            })
            .expect(expectedRequestStatus);

        expect(response.body.status).toBe(expectedBodyStatus);
        expect(response.body.items).toHaveLength(expectedBodyItemsCount);
        expect(Number(response.body.items[0].unitPrice)).toBe(expectedBodyUnitPrice);

        // Verify stock was deducted in PostgreSQL (10 - 4 = 6)
        const updatedProduct = await prisma.product.findUnique({
            where: { id: product.id },
        });
        expect(updatedProduct?.stockQuantity).toBe(expectedStockQuantity);
    });

    it(`POST ${API_ORDERS} -> rolls back entire transaction when second item exceeds stock`, async () => {
        const sku: string = 'HW-MO-01';
        const expectedRequestStatus = 400;
        const expectedStockQuantity = 10;
        const expectedOrderCount = 0;
        const expectedOrderItemCount = 0;

        const { customer, product: itemA } = await createTestScenario(prisma, {
            stockQuantity: 10,
            price: 50.0,
        });

        const { product: itemB } = await createTestScenario(prisma, {
            stockQuantity: 2,
            price: 25.0,
        });

        await request(app.getHttpServer())
          .post(`${API_ORDERS}`)
          .send({
              customerId: customer.id,
              items: [
                  { productId: itemA.id, quantity: 3 },
                  { productId: itemB.id, quantity: 5 },
              ],
          })
          .expect(expectedRequestStatus);

        const unchangedItemA = await prisma.product.findUnique({
            where: { id: itemA.id },
        });

        const orderCount = await prisma.order.count();
        const orderItemCount = await prisma.orderItem.count();

        expect(unchangedItemA?.stockQuantity).toBe(expectedStockQuantity);
        expect(orderCount).toBe(expectedOrderCount);
        expect(orderItemCount).toBe(expectedOrderItemCount);
    });


    it(`POST ${API_ORDERS} -> rejects invalid payload (quantity < 1) via ValidationPipe`, async () => {
        const { customer, product } = await createTestScenario(prisma);

        await request(app.getHttpServer())
            .post(`${API_ORDERS}`)
            .send({
                customerId: customer.id,
                items: [{ productId: product.id, quantity: 0 }],
            })
            .expect(400);
    });

    it(`GET ${API_ORDERS_SUMMARY} -> computes accurate KPI revenue and low-stock alerts`, async () => {
        const stockQuantity = 5
        const price = 100.0
        const reorderLevel = 3
        const expectedKpiRevenue = 300.0
        const expectedLowStockAlertsCount = 1
        const fulfilledOrdersCount = 1
        const fufilledOrderItemsCount = 3
        const expectedRequestStatus = 201
        const expectedRequestStatusSummary = 200

        const { customer, product } = await createTestScenario(prisma, {
            stockQuantity,
            price,
            reorderLevel,
        });

        // Fulfill 3 units -> remaining stock becomes 2 (which is <= reorderLevel 3)
        await request(app.getHttpServer())
            .post(`${API_ORDERS}`)
            .send({
                customerId: customer.id,
                items: [{ productId: product.id, quantity: fufilledOrderItemsCount }],
            })
            .expect(expectedRequestStatus);

        const summaryRes = await request(app.getHttpServer())
            .get(`${API_ORDERS_SUMMARY}`)
            .expect(expectedRequestStatusSummary);

        expect(summaryRes.body.fulfilledOrdersCount).toBe(fulfilledOrdersCount);
        expect(summaryRes.body.totalRevenue).toBe(expectedKpiRevenue);
        expect(summaryRes.body.lowStockAlertsCount).toBe(expectedLowStockAlertsCount);
        expect(summaryRes.body.lowStockProducts[0].sku).toBe(product.sku);
    });


    // === New Product & SKU Tests ===

    it(`POST ${API_PRODUCTS} -> creates a new SKU and computes isLowStock accurately`, async () => {
        const sku = 'HW-MS-01'
        const name = 'Wireless Ergonomic Mouse'
        const price = 49.99
        const stockQuantity = 3
        const reorderLevel = 5
        const isLowStock = true
        const expectedRequestStatus = 201

        const response = await request(app.getHttpServer())
          .post(`${API_PRODUCTS}`)
          .send({
              sku,
              name,
              price,
              stockQuantity,
              reorderLevel,
          })
          .expect(expectedRequestStatus);

        expect(response.body.sku).toBe(sku)
        expect(response.body.name).toBe(name)
        expect(response.body.price).toBe(price)
        expect(response.body.stockQuantity).toBe(stockQuantity)
        expect(response.body.isLowStock).toBe(isLowStock)
    })

    it(`POST ${API_PRODUCTS} -> auto-generates a unique HW-XX-XXXX SKU when sku is omitted`, async () => {
        const name = 'USB-C Hub'
        const price = 75.0
        const stockQuantity = 20
        const reorderLevel = 10
        const expectedRequestStatus = 201

        const response = await request(app.getHttpServer())
          .post(`${API_PRODUCTS}`)
          .send({
              name,
              price,
              stockQuantity,
              reorderLevel,
          })
          .expect(expectedRequestStatus);

        expect(response.body.sku).toMatch(/^HW-US-[A-Z0-9]{4}$/);
        expect(response.body.isLowStock).toBe(false);
    });

    it(`POST ${API_PRODUCTS} -> rejects duplicate SKU (case-insensitive) with 409 conflict`, async () => {
        const { product } = await createTestScenario(prisma);
        const sku = `${product.sku.toUpperCase()}`
        const name = 'Duplicate Hardware Attempt'
        const price = 120.0
        const stockQuantity = 15
        const expectedRequestStatus = 409

        const response = await request(app.getHttpServer())
          .post(`${API_PRODUCTS}`)
          .send({
              sku,
              name,
              price,
              stockQuantity,
          })
          .expect(expectedRequestStatus);

        expect(response.body.message).toContain(
          `Product with SKU "${sku}" already exists`
        );
    });

    it(`POST ${API_PRODUCTS} -> rejects invalid negative stock or zero price via ValidationPipe (400)`, async () => {
        const sku = 'HW-BAD-01'
        const name = 'Invalid Product'
        const price = 0.0
        const stockQuantity = -5
        const expectedRequestStatus = 400

        await request(app.getHttpServer())
          .post(`${API_PRODUCTS}`)
          .send({
              sku,
              name,
              price,
              stockQuantity
          })
          .expect(expectedRequestStatus)
    });

});


