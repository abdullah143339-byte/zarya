import { Module, MiddlewareConsumer, NestModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PostsModule } from './modules/posts/posts.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { AiModule } from './modules/ai/ai.module';
import { HealthModule } from './modules/health/health.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SecurityModule } from './modules/security/security.module';
import { AiRouterModule } from './modules/ai-router/ai-router.module';
import { MediaModule } from './modules/media/media.module';
import { LearningModule } from './modules/learning/learning.module';
import { AdminModule } from './modules/admin/admin.module';
import { StoriesModule } from './modules/stories/stories.module';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { SanitizerMiddleware } from './common/middleware/sanitizer.middleware';
import { LoginThrottleService } from './common/services/login-throttle.service';
import { AuditService } from './common/services/audit.service';
import { ReputationService } from './common/services/reputation.service';
import { WalletService } from './common/services/wallet.service';
import { SearchService } from './common/services/search.service';
import { NovaAiOsService } from './common/services/nova-ai-os.service';
import { RagService } from './common/services/rag.service';
import { AiIntegrationService } from './common/services/ai-integration.service';
import { ProviderFallbackService } from './common/services/provider-fallback.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    MessagesModule,
    NotificationsModule,
    CommunitiesModule,
    MarketplaceModule,
    AiModule,
    HealthModule,
    WebSocketModule,
    SecurityModule,
    AiRouterModule,
    AdminModule,
    MediaModule,
    LearningModule,
    StoriesModule,
  ],
  providers: [SecurityMiddleware, LoginThrottleService, AuditService, ReputationService, WalletService, SearchService, NovaAiOsService, RagService, AiIntegrationService, ProviderFallbackService],
  exports: [LoginThrottleService, AuditService, ReputationService, WalletService, SearchService, NovaAiOsService, RagService, AiIntegrationService, ProviderFallbackService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware, SanitizerMiddleware).forRoutes('*');
  }
}
