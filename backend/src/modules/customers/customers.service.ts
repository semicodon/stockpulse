import { Injectable } from '@nestjs/common';
import {PrismaService} from "../../prisma/prisma.service.js";


@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customer.findMany({
      orderBy: { id: 'asc' },
    });
  }
}