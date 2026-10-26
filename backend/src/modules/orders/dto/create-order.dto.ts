import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsInt,
    Min,
    ValidateNested,
} from 'class-validator';

export class OrderItemInputDto {
    @IsInt()
    productId: number;

    @IsInt()
    @Min(1)
    quantity: number;
}

export class CreateOrderDto {
    @IsInt()
    customerId: number;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => OrderItemInputDto)
    items: OrderItemInputDto[];
}