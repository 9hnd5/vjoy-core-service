import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DatabaseModule } from './modules/db/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({envFilePath: `./env/.${process.env.NODE_ENV || 'prod'}.env`}),
    DatabaseModule,
    AuthModule,
    UserModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
