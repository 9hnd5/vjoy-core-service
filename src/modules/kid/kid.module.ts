import { Module } from '@nestjs/common';
import { KidService } from './kid.service';
import { KidController } from './kid.controller';

@Module({
  controllers: [KidController],
  providers: [KidService]
})
export class KidModule {}
