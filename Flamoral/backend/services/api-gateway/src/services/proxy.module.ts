import { Module, Global } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { CircuitBreakerService } from './circuit-breaker.service';

@Global()
@Module({
  providers: [ProxyService, CircuitBreakerService],
  exports: [ProxyService, CircuitBreakerService],
})
export class ProxyModule {}
