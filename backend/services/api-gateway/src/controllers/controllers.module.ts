import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MessagingController } from './messaging.controller';

@Module({
  controllers: [AuthController, MessagingController],
})
export class ControllersModule {}
