import {PrismaClient} from "@prisma/client";


export async function resetDatabase(prisma: PrismaClient) {
    await prisma.$transaction([
        prisma.orderItem.deleteMany(),
        prisma.order.deleteMany(),
        prisma.product.deleteMany(),
        prisma.customer.deleteMany(),
    ]);
}

export async function createTestScenario(
    prisma: PrismaClient,
    overrides?: { stockQuantity?: number; price?: number; reorderLevel?: number },
) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const customer = await prisma.customer.create({
        data: {
            name: 'Test Buyer',
            email: `buyer-${uniqueId}@test.io`,
            country: 'USA',
        },
    });

    const product = await prisma.product.create({
        data: {
            sku: `SKU-${uniqueId}`,
            name: 'Test Hardware',
            price: overrides?.price ?? 100.0,
            stockQuantity: overrides?.stockQuantity ?? 10,
            reorderLevel: overrides?.reorderLevel ?? 3,
        },
    });

    return { customer, product };
}