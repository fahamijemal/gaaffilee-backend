import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { AdminService } from './admin.service';
import { NavigationModule } from '../navigation/navigation.module';

@Module({
  imports: [NavigationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
