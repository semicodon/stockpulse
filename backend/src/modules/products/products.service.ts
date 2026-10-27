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
    async create(dto: CreateProductDto) {
        const existing = await this.prisma.product.findUnique({
            where: { sku: dto.sku },
        });

        if (existing) {
            throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
        }

        const product = await this.prisma.product.create({
            data: {
                sku: dto.sku,
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