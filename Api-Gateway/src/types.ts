export interface ICircuitBreaker {
    serviceName: string;
    failureCount: number;
    threshold: number;
    
}