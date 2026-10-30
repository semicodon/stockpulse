import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
    @IsOptional()
    @IsString()
    sku?: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    price: number;

    @IsInt()
    @Min(0)
    stockQuantity: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    reorderLevel?: number;
}