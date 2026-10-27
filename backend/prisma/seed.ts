import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, OrderStatus } from '@prisma/client';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding StockPulse development database...');

    // 1. Upsert Customers (Idempotent by unique email)
    const alice = await prisma.customer.upsert({
        where: { email: 'alice@enterprise.io' },
        update: { name: 'Alice Johnson', country: 'USA' },
        create: {
            name: 'Alice Johnson',
            email: 'alice@enterprise.io',
            country: 'USA',
        },
    });

    const bob = await prisma.customer.upsert({
        where: { email: 'bob@mapleleaf.ca' },
        update: { name: 'Bob Smith', country: 'Canada' },
        create: {
            name: 'Bob Smith',
            email: 'bob@mapleleaf.ca',
            country: 'Canada',
        },
    });

    const diana = await prisma.customer.upsert({
        where: { email: 'diana@albion.co.uk' },
        update: { name: 'Diana Prince', country: 'UK' },
        create: {
            name: 'Diana Prince',
            email: 'diana@albion.co.uk',
            country: 'UK',
        },
    });

    // 2. Upsert Products (Idempotent by unique SKU)
    const keyboard = await prisma.product.upsert({
        where: { sku: 'HW-KB-01' },
        update: {},
        create: {
            sku: 'HW-KB-01',
            name: 'Mechanical Keyboard',
            price: 120.0,
            stockQuantity: 25,
            reorderLevel: 10,
        },
    });

    const monitor = await prisma.product.upsert({
        where: { sku: 'HW-MN-4K' },
        update: {},
        create: {
            sku: 'HW-MN-4K',
            name: '4K UltraWide Monitor',
            price: 400.0,
            stockQuantity: 4, // Below reorderLevel (5) -> triggers Low-Stock alert
            reorderLevel: 5,
        },
    });

    const dock = await prisma.product.upsert({
        where: { sku: 'HW-DK-TB4' },
        update: {},
        create: {
            sku: 'HW-DK-TB4',
            name: 'Thunderbolt 4 Docking Station',
            price: 210.0,
            stockQuantity: 15,
            reorderLevel: 8,
        },
    });

    // 3. Seed an initial fulfilled order only if no orders exist yet
    const existingOrdersCount = await prisma.order.count();
    if (existingOrdersCount === 0) {
        await prisma.order.create({
            data: {
                customerId: alice.id,
                status: OrderStatus.FULFILLED,
                items: {
                    create: [
                        {
                            productId: keyboard.id,
                            quantity: 2,
                            unitPrice: keyboard.price,
                        },
                        {
                            productId: monitor.id,
                            quantity: 1,
                            unitPrice: monitor.price,
                        },
                    ],
                },
            },
        });
    }

    console.log('Seed completed:', {
        customers: [alice.email, bob.email, diana.email],
        products: [keyboard.sku, monitor.sku, dock.sku],
    });
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });