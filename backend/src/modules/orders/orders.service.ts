import {
    BadRequestException, Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { CreateOrderDto } from './dto/create-order.dto.js';
import {PrismaService} from "../../prisma.service.js";
import {OrderStatus} from "../../generated/prisma/enums.js";

@Injectable()
export class OrdersService {
    constructor( private readonly prisma: PrismaService ) {}
    async createFulfillmentOrder(dto: CreateOrderDto) {
        return this.prisma.$transaction(

            async (tx) => {

            // 1. Verify customer exists
            const customer = await tx.customer.findUnique({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new NotFoundException(`Customer #${dto.customerId} not found`);
            }

            // 2. Verify stock availability and lock in historical unit prices
            const lineItemsToCreate: Array<{
                productId: number;
                quantity: number;
                unitPrice: number;
            }> = [];


            /*
            * Iterate over items and verify stock availability. If available, lock the stock and add to line items to create. If inventory is insufficient, throw an error.
            * */
            for(const item of dto.items) {

                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });

                if (!product) {
                    throw new NotFoundException(`Product #${item.productId} not found`);
                }
                if (product.stockQuantity < item.quantity) {
                    throw new BadRequestException(
                        `Insufficient stock for ${product.sku} (${product.name}). Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
                    );
                }

                // Decrement inventory atomically inside the transaction
                await tx.product.update({
                    where: { id: product.id },
                    data: { stockQuantity: {
                        decrement: item.quantity } },
                });

                // Add line item to create
                lineItemsToCreate.push({
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice: Number(product.price),
                });
            }

            // 3. Create the fulfillment order and its associated line items
            return tx.order.create({
                data: {
                    customerId: dto.customerId,
                    status: OrderStatus.FULFILLED,
                    items: {
                        create: lineItemsToCreate,
                    },
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            country: true } },
                    items: {
                        include: {
                            product: {
                                select: {
                                    sku: true,
                                    name: true } } },
                    },
                },
            });
        })
    }

    async getOperationalSummary() {
        const [orders, allProducts] = await Promise.all([
            this.prisma.order.findMany({
                where: { status: OrderStatus.FULFILLED },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            country: true
                        } },
                    items: {
                        include: {
                            product: {
                                select: {
                                    sku: true,
                                    name: true
                                } } },
                    },
            },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.product.findMany({
                orderBy: { sku: 'asc' },
            }),
        ]);

        const lowStockProducts = allProducts
            .filter((p) => p.stockQuantity <= p.reorderLevel)
            .map((p) => ({
                ...p,
                price: Number(p.price),
            }));

        const totalRevenue = orders.reduce((acc, order) => {
            const orderTotal = order.items.reduce(
                (sum, item) => sum + Number(item.unitPrice) * item.quantity,
                0,
            );
            return acc + orderTotal;
        }, 0);


        return {
            fulfilledOrdersCount: orders.length,
            totalRevenue: Number(totalRevenue.toFixed(2)),
            lowStockAlertsCount: lowStockProducts.length,
            lowStockProducts,
            recentOrders: orders.slice(0, 10),
        };
    };
}