import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';


@Controller('api/products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {
    }
    @Get()
    findAll() {
        return this.productsService.findAll();
    }
    @Get(':id')
    findOne(@Param('id', ParseIntPipe)
            id: number) {
        return this.productsService.findOne(id);
    }

    @Post()
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    @Patch(':id/stock')
    updateStock(
        @Param('id', ParseIntPipe)
        id: number,
        @Body() updateStockDto: UpdateStockDto,
    ) {
        return this.productsService.updateStock(id, updateStockDto);
    }
}