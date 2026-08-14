import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Deixa o Prisma disponível na aplicação inteira sem precisar reimportar
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}