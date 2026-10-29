import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {PrismaService} from "../../prisma/prisma.service.js";
import {CreateProductDto} from "./dto/create-product.dto.js";
import {UpdateStockDto} from "./dto/update-stock.dto.js";

@Injectable()
export class ProductsService {

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Finds all products and returns them with their price and low stock status.
     */
    async findAll() {
        const products = await this.prisma.product.findMany({
            orderBy: { sku: 'asc' }
        });

        return products.map( (product) => ({
            ...product,
            price: Number(product.price),
            isLowStock: product.stockQuantity <= product.reorderLevel,
        }));
    }

    /*
    * Finds one product by id and returns them with their price and low stock status.
     */
    async findOne(id: number) {
        const product = await this.prisma.product.findUnique({
            where: {id},
        });

        if (!product) {
            throw new NotFoundException(`Product #${id} not found`);
        }

        return {
            ...product,
            price: Number(product.price),
            isLowStock: product.stockQuantity <= product.reorderLevel,
        };
    }

    /*
    * Creates a new product and returns it with its price and low stock status.
    */
    private async generateUniqueDatabaseSku(name: string): Promise<string> {
        const prefix =
          name
            .replace(/[^a-zA-Z]/g, '')
            .substring(0, 2)
            .toUpperCase() || 'GN';

        while (true) {
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            const candidateSku = `HW-${prefix}-${randomCode}`;

            const existing = await this.prisma.product.findUnique({
                where: { sku: candidateSku },
            });

            if (!existing) {
                return candidateSku;
            }
        }
    }

    async create(dto: CreateProductDto) {
        const providedSku = dto.sku?.trim().toUpperCase();
        let finalSku: string;

        if (providedSku) {
            // 1. If a SKU was given, check for duplicates in PostgreSQL
            const existing = await this.prisma.product.findUnique({
                where: { sku: providedSku },
            });

            if (existing) {
                throw new ConflictException(
                  `Product with SKU "${providedSku}" already exists`,
                );
            }
            finalSku = providedSku;
        } else {
            // 2. If no SKU was given, generate a guaranteed-unique random SKU
            finalSku = await this.generateUniqueDatabaseSku(dto.name);
        }

        const product = await this.prisma.product.create({
            data: {
                sku: finalSku,
                name: dto.name,
                price: dto.price,
                stockQuantity: dto.stockQuantity,
                reorderLevel: dto.reorderLevel ?? 10,
            },
        });

        return {
            ...product,
            price: Number(product.price),
            isLowStock: product.stockQuantity <= product.reorderLevel,
        };
    }

    async updateStock(id: number, dto: UpdateStockDto) {
        await this.findOne(id);

        const updated = await this.prisma.product.update({
            where: { id },
            data: { stockQuantity: dto.stockQuantity },
        });

        return {
            ...updated,
            price: Number(updated.price),
            isLowStock: updated.stockQuantity <= updated.reorderLevel,
        };
    }

}