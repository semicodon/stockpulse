import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {PrismaModule} from "./prisma/prisma.module.js";
import {AppController} from "./app.controller.js";
import {AppService} from "./app.service.js";
import {ProductsModule} from "./modules/products/products.module.js";
import {OrdersModule} from "./modules/orders/orders.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ProductsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}