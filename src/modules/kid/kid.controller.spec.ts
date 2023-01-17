import { Test, TestingModule } from '@nestjs/testing';
import { KidController } from './kid.controller';
import { KidService } from './kid.service';

describe('KidController', () => {
  let controller: KidController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KidController],
      providers: [KidService],
    }).compile();

    controller = module.get<KidController>(KidController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
