import { InitialModule } from "@common";
import { Module } from "@nestjs/common";
import { AuthModule } from "modules/auth/auth.module";
import { KidsModule } from "modules/kids/kids.module";
import { UsersModule } from "modules/users/users.module";

@Module({
  imports: [InitialModule, AuthModule, KidsModule, UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
