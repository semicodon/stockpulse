import { Body, Controller, Get, Post } from '@nestjs/common';
import {OrdersService} from "./orders.service.js";
import {CreateOrderDto} from "./dto/create-order.dto.js";



@Controller('api/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post()
    createOrder(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.createFulfillmentOrder(createOrderDto);
    }

    @Get('summary')
    getSummary() {
        return this.ordersService.getOperationalSummary();
    }
}