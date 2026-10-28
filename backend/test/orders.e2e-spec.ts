import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import {AppModule} from "../src/app.module.js";
import {createTestScenario, resetDatabase} from "./helpers/seed-factory.js";
import {PrismaService} from "../src/prisma/prisma.service.js";


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

    it('POST /api/orders -> fulfills a valid order and decrements stock atomically', async () => {
        const { customer, product } = await createTestScenario(prisma, {
            stockQuantity: 10,
            price: 150.0,
        });

        const response = await request(app.getHttpServer())
            .post('/api/orders')
            .send({
                customerId: customer.id,
                items: [{ productId: product.id, quantity: 4 }],
            })
            .expect(201);

        expect(response.body.status).toBe('FULFILLED');
        expect(response.body.items).toHaveLength(1);
        expect(Number(response.body.items[0].unitPrice)).toBe(150.0);

        // Verify stock was deducted in PostgreSQL (10 - 4 = 6)
        const updatedProduct = await prisma.product.findUnique({
            where: { id: product.id },
        });
        expect(updatedProduct?.stockQuantity).toBe(6);
    });

    it('POST /api/orders -> rolls back entire transaction when second item exceeds stock', async () => {
        const { customer, product: itemA } = await createTestScenario(prisma, {
            stockQuantity: 10,
            price: 50.0,
        });
        const { product: itemB } = await createTestScenario(prisma, {
            stockQuantity: 2, // Only 2 left in stock
            price: 200.0,
        });

        // Request 3 of itemA (valid) and 5 of itemB (insufficient stock)
        await request(app.getHttpServer())
            .post('/api/orders')
            .send({
                customerId: customer.id,
                items: [
                    { productId: itemA.id, quantity: 3 },
                    { productId: itemB.id, quantity: 5 },
                ],
            })
            .expect(400);

        // Verify itemA's stock was rolled back to 10 and no orders were created
        const unchangedItemA = await prisma.product.findUnique({
            where: { id: itemA.id },
        });
        const orderCount = await prisma.order.count();

        expect(unchangedItemA?.stockQuantity).toBe(10);
        expect(orderCount).toBe(0);
    });

    it('POST /api/orders -> rejects invalid payload (quantity < 1) via ValidationPipe', async () => {
        const { customer, product } = await createTestScenario(prisma);

        await request(app.getHttpServer())
            .post('/api/orders')
            .send({
                customerId: customer.id,
                items: [{ productId: product.id, quantity: 0 }],
            })
            .expect(400);
    });

    it('GET /api/orders/summary -> computes accurate KPI revenue and low-stock alerts', async () => {
        const { customer, product } = await createTestScenario(prisma, {
            stockQuantity: 5,
            price: 100.0,
            reorderLevel: 3,
        });

        // Fulfill 3 units -> remaining stock becomes 2 (which is <= reorderLevel 3)
        await request(app.getHttpServer())
            .post('/api/orders')
            .send({
                customerId: customer.id,
                items: [{ productId: product.id, quantity: 3 }],
            })
            .expect(201);

        const summaryRes = await request(app.getHttpServer())
            .get('/api/orders/summary')
            .expect(200);

        expect(summaryRes.body.fulfilledOrdersCount).toBe(1);
        expect(summaryRes.body.totalRevenue).toBe(300.0);
        expect(summaryRes.body.lowStockAlertsCount).toBe(1);
        expect(summaryRes.body.lowStockProducts[0].sku).toBe(product.sku);
    });
});