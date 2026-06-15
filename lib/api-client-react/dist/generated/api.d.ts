import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AdminAddLabTestBody, AdminDeleteLabTest200, AdminListTickets200, AdminListTicketsParams, AdminUpdateLabTestBody, AdminUpdateTicketStatus200, AdminUpdateTicketStatusBody, ApproveLabTest200, CreateOrderRequest, CreateTicketRequest, DeliveryMethod, ErrorResponse, GetLabTestFilters200, GetLabTestImages200, HealthStatus, LabTest, LabTestMetrics, LabTestSubmitRequest, ListLabTestsParams, ListMyTickets200, LookupOrderRequest, OrderResponse, PostTicketMessageRequest, Product, RejectLabTest200, SiteConfig, SubmitLabTest200, Ticket, TicketMessage, TicketWithMessages, UpdateOrderRequest } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary List approved lab test reports with optional filtering
 */
export declare const getListLabTestsUrl: (params?: ListLabTestsParams) => string;
export declare const listLabTests: (params?: ListLabTestsParams, options?: RequestInit) => Promise<LabTest[]>;
export declare const getListLabTestsQueryKey: (params?: ListLabTestsParams) => readonly ["/api/lab-tests", ...ListLabTestsParams[]];
export declare const getListLabTestsQueryOptions: <TData = Awaited<ReturnType<typeof listLabTests>>, TError = ErrorType<unknown>>(params?: ListLabTestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listLabTests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listLabTests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListLabTestsQueryResult = NonNullable<Awaited<ReturnType<typeof listLabTests>>>;
export type ListLabTestsQueryError = ErrorType<unknown>;
/**
 * @summary List approved lab test reports with optional filtering
 */
export declare function useListLabTests<TData = Awaited<ReturnType<typeof listLabTests>>, TError = ErrorType<unknown>>(params?: ListLabTestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listLabTests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Aggregate statistics across all approved lab tests
 */
export declare const getGetLabTestMetricsUrl: () => string;
export declare const getLabTestMetrics: (options?: RequestInit) => Promise<LabTestMetrics>;
export declare const getGetLabTestMetricsQueryKey: () => readonly ["/api/lab-tests/metrics"];
export declare const getGetLabTestMetricsQueryOptions: <TData = Awaited<ReturnType<typeof getLabTestMetrics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTestMetrics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLabTestMetrics>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLabTestMetricsQueryResult = NonNullable<Awaited<ReturnType<typeof getLabTestMetrics>>>;
export type GetLabTestMetricsQueryError = ErrorType<unknown>;
/**
 * @summary Aggregate statistics across all approved lab tests
 */
export declare function useGetLabTestMetrics<TData = Awaited<ReturnType<typeof getLabTestMetrics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTestMetrics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Distinct filter values available across approved tests
 */
export declare const getGetLabTestFiltersUrl: () => string;
export declare const getLabTestFilters: (options?: RequestInit) => Promise<GetLabTestFilters200>;
export declare const getGetLabTestFiltersQueryKey: () => readonly ["/api/lab-tests/filters"];
export declare const getGetLabTestFiltersQueryOptions: <TData = Awaited<ReturnType<typeof getLabTestFilters>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTestFilters>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLabTestFilters>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLabTestFiltersQueryResult = NonNullable<Awaited<ReturnType<typeof getLabTestFilters>>>;
export type GetLabTestFiltersQueryError = ErrorType<unknown>;
/**
 * @summary Distinct filter values available across approved tests
 */
export declare function useGetLabTestFilters<TData = Awaited<ReturnType<typeof getLabTestFilters>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTestFilters>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Submit a community lab report for admin review
 */
export declare const getSubmitLabTestUrl: () => string;
export declare const submitLabTest: (labTestSubmitRequest: LabTestSubmitRequest, options?: RequestInit) => Promise<SubmitLabTest200>;
export declare const getSubmitLabTestMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitLabTest>>, TError, {
        data: BodyType<LabTestSubmitRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitLabTest>>, TError, {
    data: BodyType<LabTestSubmitRequest>;
}, TContext>;
export type SubmitLabTestMutationResult = NonNullable<Awaited<ReturnType<typeof submitLabTest>>>;
export type SubmitLabTestMutationBody = BodyType<LabTestSubmitRequest>;
export type SubmitLabTestMutationError = ErrorType<ErrorResponse>;
/**
* @summary Submit a community lab report for admin review
*/
export declare const useSubmitLabTest: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitLabTest>>, TError, {
        data: BodyType<LabTestSubmitRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitLabTest>>, TError, {
    data: BodyType<LabTestSubmitRequest>;
}, TContext>;
/**
 * @summary Get a single lab test record
 */
export declare const getGetLabTestUrl: (id: number) => string;
export declare const getLabTest: (id: number, options?: RequestInit) => Promise<LabTest>;
export declare const getGetLabTestQueryKey: (id: number) => readonly [`/api/lab-tests/${number}`];
export declare const getGetLabTestQueryOptions: <TData = Awaited<ReturnType<typeof getLabTest>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTest>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLabTest>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLabTestQueryResult = NonNullable<Awaited<ReturnType<typeof getLabTest>>>;
export type GetLabTestQueryError = ErrorType<void>;
/**
 * @summary Get a single lab test record
 */
export declare function useGetLabTest<TData = Awaited<ReturnType<typeof getLabTest>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTest>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Fetch proxied CoA report image URLs for a lab test
 */
export declare const getGetLabTestImagesUrl: (id: number) => string;
export declare const getLabTestImages: (id: number, options?: RequestInit) => Promise<GetLabTestImages200>;
export declare const getGetLabTestImagesQueryKey: (id: number) => readonly [`/api/lab-tests/${number}/images`];
export declare const getGetLabTestImagesQueryOptions: <TData = Awaited<ReturnType<typeof getLabTestImages>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTestImages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLabTestImages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLabTestImagesQueryResult = NonNullable<Awaited<ReturnType<typeof getLabTestImages>>>;
export type GetLabTestImagesQueryError = ErrorType<unknown>;
/**
 * @summary Fetch proxied CoA report image URLs for a lab test
 */
export declare function useGetLabTestImages<TData = Awaited<ReturnType<typeof getLabTestImages>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLabTestImages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List community submissions awaiting admin review
 */
export declare const getGetPendingLabTestsUrl: () => string;
export declare const getPendingLabTests: (options?: RequestInit) => Promise<LabTest[]>;
export declare const getGetPendingLabTestsQueryKey: () => readonly ["/api/admin/lab-tests/pending"];
export declare const getGetPendingLabTestsQueryOptions: <TData = Awaited<ReturnType<typeof getPendingLabTests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPendingLabTests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPendingLabTests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPendingLabTestsQueryResult = NonNullable<Awaited<ReturnType<typeof getPendingLabTests>>>;
export type GetPendingLabTestsQueryError = ErrorType<unknown>;
/**
 * @summary List community submissions awaiting admin review
 */
export declare function useGetPendingLabTests<TData = Awaited<ReturnType<typeof getPendingLabTests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPendingLabTests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Approve a pending community submission
 */
export declare const getApproveLabTestUrl: (id: number) => string;
export declare const approveLabTest: (id: number, options?: RequestInit) => Promise<ApproveLabTest200>;
export declare const getApproveLabTestMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveLabTest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof approveLabTest>>, TError, {
    id: number;
}, TContext>;
export type ApproveLabTestMutationResult = NonNullable<Awaited<ReturnType<typeof approveLabTest>>>;
export type ApproveLabTestMutationError = ErrorType<void>;
/**
* @summary Approve a pending community submission
*/
export declare const useApproveLabTest: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveLabTest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof approveLabTest>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Reject and permanently delete a pending community submission
 */
export declare const getRejectLabTestUrl: (id: number) => string;
export declare const rejectLabTest: (id: number, options?: RequestInit) => Promise<RejectLabTest200>;
export declare const getRejectLabTestMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rejectLabTest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof rejectLabTest>>, TError, {
    id: number;
}, TContext>;
export type RejectLabTestMutationResult = NonNullable<Awaited<ReturnType<typeof rejectLabTest>>>;
export type RejectLabTestMutationError = ErrorType<void>;
/**
* @summary Reject and permanently delete a pending community submission
*/
export declare const useRejectLabTest: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rejectLabTest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof rejectLabTest>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Admin — add a new lab test record directly
 */
export declare const getAdminAddLabTestUrl: () => string;
export declare const adminAddLabTest: (adminAddLabTestBody: AdminAddLabTestBody, options?: RequestInit) => Promise<LabTest>;
export declare const getAdminAddLabTestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminAddLabTest>>, TError, {
        data: BodyType<AdminAddLabTestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminAddLabTest>>, TError, {
    data: BodyType<AdminAddLabTestBody>;
}, TContext>;
export type AdminAddLabTestMutationResult = NonNullable<Awaited<ReturnType<typeof adminAddLabTest>>>;
export type AdminAddLabTestMutationBody = BodyType<AdminAddLabTestBody>;
export type AdminAddLabTestMutationError = ErrorType<unknown>;
/**
* @summary Admin — add a new lab test record directly
*/
export declare const useAdminAddLabTest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminAddLabTest>>, TError, {
        data: BodyType<AdminAddLabTestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminAddLabTest>>, TError, {
    data: BodyType<AdminAddLabTestBody>;
}, TContext>;
/**
 * @summary Admin — update CoA values and metadata on a lab test
 */
export declare const getAdminUpdateLabTestUrl: (id: number) => string;
export declare const adminUpdateLabTest: (id: number, adminUpdateLabTestBody: AdminUpdateLabTestBody, options?: RequestInit) => Promise<LabTest>;
export declare const getAdminUpdateLabTestMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateLabTest>>, TError, {
        id: number;
        data: BodyType<AdminUpdateLabTestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateLabTest>>, TError, {
    id: number;
    data: BodyType<AdminUpdateLabTestBody>;
}, TContext>;
export type AdminUpdateLabTestMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateLabTest>>>;
export type AdminUpdateLabTestMutationBody = BodyType<AdminUpdateLabTestBody>;
export type AdminUpdateLabTestMutationError = ErrorType<void>;
/**
* @summary Admin — update CoA values and metadata on a lab test
*/
export declare const useAdminUpdateLabTest: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateLabTest>>, TError, {
        id: number;
        data: BodyType<AdminUpdateLabTestBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateLabTest>>, TError, {
    id: number;
    data: BodyType<AdminUpdateLabTestBody>;
}, TContext>;
/**
 * @summary Admin — permanently delete a lab test record
 */
export declare const getAdminDeleteLabTestUrl: (id: number) => string;
export declare const adminDeleteLabTest: (id: number, options?: RequestInit) => Promise<AdminDeleteLabTest200>;
export declare const getAdminDeleteLabTestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteLabTest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteLabTest>>, TError, {
    id: number;
}, TContext>;
export type AdminDeleteLabTestMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteLabTest>>>;
export type AdminDeleteLabTestMutationError = ErrorType<unknown>;
/**
* @summary Admin — permanently delete a lab test record
*/
export declare const useAdminDeleteLabTest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteLabTest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteLabTest>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all active products
 */
export declare const getGetProductsUrl: () => string;
export declare const getProducts: (options?: RequestInit) => Promise<Product[]>;
export declare const getGetProductsQueryKey: () => readonly ["/api/products"];
export declare const getGetProductsQueryOptions: <TData = Awaited<ReturnType<typeof getProducts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProducts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProductsQueryResult = NonNullable<Awaited<ReturnType<typeof getProducts>>>;
export type GetProductsQueryError = ErrorType<unknown>;
/**
 * @summary List all active products
 */
export declare function useGetProducts<TData = Awaited<ReturnType<typeof getProducts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all active delivery methods with prices
 */
export declare const getGetDeliveryMethodsUrl: () => string;
export declare const getDeliveryMethods: (options?: RequestInit) => Promise<DeliveryMethod[]>;
export declare const getGetDeliveryMethodsQueryKey: () => readonly ["/api/delivery-methods"];
export declare const getGetDeliveryMethodsQueryOptions: <TData = Awaited<ReturnType<typeof getDeliveryMethods>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeliveryMethods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDeliveryMethods>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDeliveryMethodsQueryResult = NonNullable<Awaited<ReturnType<typeof getDeliveryMethods>>>;
export type GetDeliveryMethodsQueryError = ErrorType<unknown>;
/**
 * @summary List all active delivery methods with prices
 */
export declare function useGetDeliveryMethods<TData = Awaited<ReturnType<typeof getDeliveryMethods>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeliveryMethods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get site configuration (vendor shipping price, etc.)
 */
export declare const getGetSiteConfigUrl: () => string;
export declare const getSiteConfig: (options?: RequestInit) => Promise<SiteConfig>;
export declare const getGetSiteConfigQueryKey: () => readonly ["/api/config"];
export declare const getGetSiteConfigQueryOptions: <TData = Awaited<ReturnType<typeof getSiteConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSiteConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSiteConfig>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSiteConfigQueryResult = NonNullable<Awaited<ReturnType<typeof getSiteConfig>>>;
export type GetSiteConfigQueryError = ErrorType<unknown>;
/**
 * @summary Get site configuration (vendor shipping price, etc.)
 */
export declare function useGetSiteConfig<TData = Awaited<ReturnType<typeof getSiteConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSiteConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new order
 */
export declare const getCreateOrderUrl: () => string;
export declare const createOrder: (createOrderRequest: CreateOrderRequest, options?: RequestInit) => Promise<OrderResponse>;
export declare const getCreateOrderMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<CreateOrderRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<CreateOrderRequest>;
}, TContext>;
export type CreateOrderMutationResult = NonNullable<Awaited<ReturnType<typeof createOrder>>>;
export type CreateOrderMutationBody = BodyType<CreateOrderRequest>;
export type CreateOrderMutationError = ErrorType<ErrorResponse>;
/**
* @summary Create a new order
*/
export declare const useCreateOrder: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<CreateOrderRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<CreateOrderRequest>;
}, TContext>;
/**
 * @summary Look up an existing order
 */
export declare const getLookupOrderUrl: () => string;
export declare const lookupOrder: (lookupOrderRequest: LookupOrderRequest, options?: RequestInit) => Promise<OrderResponse>;
export declare const getLookupOrderMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupOrder>>, TError, {
        data: BodyType<LookupOrderRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof lookupOrder>>, TError, {
    data: BodyType<LookupOrderRequest>;
}, TContext>;
export type LookupOrderMutationResult = NonNullable<Awaited<ReturnType<typeof lookupOrder>>>;
export type LookupOrderMutationBody = BodyType<LookupOrderRequest>;
export type LookupOrderMutationError = ErrorType<ErrorResponse>;
/**
* @summary Look up an existing order
*/
export declare const useLookupOrder: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof lookupOrder>>, TError, {
        data: BodyType<LookupOrderRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof lookupOrder>>, TError, {
    data: BodyType<LookupOrderRequest>;
}, TContext>;
/**
 * @summary Update an existing order
 */
export declare const getUpdateOrderUrl: (orderId: string) => string;
export declare const updateOrder: (orderId: string, updateOrderRequest: UpdateOrderRequest, options?: RequestInit) => Promise<OrderResponse>;
export declare const getUpdateOrderMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrder>>, TError, {
        orderId: string;
        data: BodyType<UpdateOrderRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateOrder>>, TError, {
    orderId: string;
    data: BodyType<UpdateOrderRequest>;
}, TContext>;
export type UpdateOrderMutationResult = NonNullable<Awaited<ReturnType<typeof updateOrder>>>;
export type UpdateOrderMutationBody = BodyType<UpdateOrderRequest>;
export type UpdateOrderMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update an existing order
*/
export declare const useUpdateOrder: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrder>>, TError, {
        orderId: string;
        data: BodyType<UpdateOrderRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateOrder>>, TError, {
    orderId: string;
    data: BodyType<UpdateOrderRequest>;
}, TContext>;
/**
 * @summary Create a new support ticket (JWT auth)
 */
export declare const getCreateTicketUrl: () => string;
export declare const createTicket: (createTicketRequest: CreateTicketRequest, options?: RequestInit) => Promise<Ticket>;
export declare const getCreateTicketMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTicket>>, TError, {
        data: BodyType<CreateTicketRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTicket>>, TError, {
    data: BodyType<CreateTicketRequest>;
}, TContext>;
export type CreateTicketMutationResult = NonNullable<Awaited<ReturnType<typeof createTicket>>>;
export type CreateTicketMutationBody = BodyType<CreateTicketRequest>;
export type CreateTicketMutationError = ErrorType<unknown>;
/**
* @summary Create a new support ticket (JWT auth)
*/
export declare const useCreateTicket: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTicket>>, TError, {
        data: BodyType<CreateTicketRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTicket>>, TError, {
    data: BodyType<CreateTicketRequest>;
}, TContext>;
/**
 * @summary List own tickets (JWT auth)
 */
export declare const getListMyTicketsUrl: () => string;
export declare const listMyTickets: (options?: RequestInit) => Promise<ListMyTickets200>;
export declare const getListMyTicketsQueryKey: () => readonly ["/api/account/tickets"];
export declare const getListMyTicketsQueryOptions: <TData = Awaited<ReturnType<typeof listMyTickets>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMyTickets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMyTicketsQueryResult = NonNullable<Awaited<ReturnType<typeof listMyTickets>>>;
export type ListMyTicketsQueryError = ErrorType<unknown>;
/**
 * @summary List own tickets (JWT auth)
 */
export declare function useListMyTickets<TData = Awaited<ReturnType<typeof listMyTickets>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get a single ticket with message thread (JWT auth)
 */
export declare const getGetMyTicketUrl: (id: string) => string;
export declare const getMyTicket: (id: string, options?: RequestInit) => Promise<TicketWithMessages>;
export declare const getGetMyTicketQueryKey: (id: string) => readonly [`/api/account/tickets/${string}`];
export declare const getGetMyTicketQueryOptions: <TData = Awaited<ReturnType<typeof getMyTicket>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyTicket>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyTicket>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMyTicketQueryResult = NonNullable<Awaited<ReturnType<typeof getMyTicket>>>;
export type GetMyTicketQueryError = ErrorType<unknown>;
/**
 * @summary Get a single ticket with message thread (JWT auth)
 */
export declare function useGetMyTicket<TData = Awaited<ReturnType<typeof getMyTicket>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyTicket>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Post a reply on a ticket (JWT auth)
 */
export declare const getPostTicketMessageUrl: (id: string) => string;
export declare const postTicketMessage: (id: string, postTicketMessageRequest: PostTicketMessageRequest, options?: RequestInit) => Promise<TicketMessage>;
export declare const getPostTicketMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postTicketMessage>>, TError, {
        id: string;
        data: BodyType<PostTicketMessageRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof postTicketMessage>>, TError, {
    id: string;
    data: BodyType<PostTicketMessageRequest>;
}, TContext>;
export type PostTicketMessageMutationResult = NonNullable<Awaited<ReturnType<typeof postTicketMessage>>>;
export type PostTicketMessageMutationBody = BodyType<PostTicketMessageRequest>;
export type PostTicketMessageMutationError = ErrorType<unknown>;
/**
* @summary Post a reply on a ticket (JWT auth)
*/
export declare const usePostTicketMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postTicketMessage>>, TError, {
        id: string;
        data: BodyType<PostTicketMessageRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof postTicketMessage>>, TError, {
    id: string;
    data: BodyType<PostTicketMessageRequest>;
}, TContext>;
/**
 * @summary List all tickets with optional filters (admin)
 */
export declare const getAdminListTicketsUrl: (params?: AdminListTicketsParams) => string;
export declare const adminListTickets: (params?: AdminListTicketsParams, options?: RequestInit) => Promise<AdminListTickets200>;
export declare const getAdminListTicketsQueryKey: (params?: AdminListTicketsParams) => readonly ["/api/admin/tickets", ...AdminListTicketsParams[]];
export declare const getAdminListTicketsQueryOptions: <TData = Awaited<ReturnType<typeof adminListTickets>>, TError = ErrorType<unknown>>(params?: AdminListTicketsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListTickets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListTicketsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListTickets>>>;
export type AdminListTicketsQueryError = ErrorType<unknown>;
/**
 * @summary List all tickets with optional filters (admin)
 */
export declare function useAdminListTickets<TData = Awaited<ReturnType<typeof adminListTickets>>, TError = ErrorType<unknown>>(params?: AdminListTicketsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get a ticket with thread (admin)
 */
export declare const getAdminGetTicketUrl: (id: string) => string;
export declare const adminGetTicket: (id: string, options?: RequestInit) => Promise<TicketWithMessages>;
export declare const getAdminGetTicketQueryKey: (id: string) => readonly [`/api/admin/tickets/${string}`];
export declare const getAdminGetTicketQueryOptions: <TData = Awaited<ReturnType<typeof adminGetTicket>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetTicket>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetTicket>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetTicketQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetTicket>>>;
export type AdminGetTicketQueryError = ErrorType<unknown>;
/**
 * @summary Get a ticket with thread (admin)
 */
export declare function useAdminGetTicket<TData = Awaited<ReturnType<typeof adminGetTicket>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetTicket>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Change ticket status (admin)
 */
export declare const getAdminUpdateTicketStatusUrl: (id: string) => string;
export declare const adminUpdateTicketStatus: (id: string, adminUpdateTicketStatusBody: AdminUpdateTicketStatusBody, options?: RequestInit) => Promise<AdminUpdateTicketStatus200>;
export declare const getAdminUpdateTicketStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateTicketStatus>>, TError, {
        id: string;
        data: BodyType<AdminUpdateTicketStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateTicketStatus>>, TError, {
    id: string;
    data: BodyType<AdminUpdateTicketStatusBody>;
}, TContext>;
export type AdminUpdateTicketStatusMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateTicketStatus>>>;
export type AdminUpdateTicketStatusMutationBody = BodyType<AdminUpdateTicketStatusBody>;
export type AdminUpdateTicketStatusMutationError = ErrorType<unknown>;
/**
* @summary Change ticket status (admin)
*/
export declare const useAdminUpdateTicketStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateTicketStatus>>, TError, {
        id: string;
        data: BodyType<AdminUpdateTicketStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateTicketStatus>>, TError, {
    id: string;
    data: BodyType<AdminUpdateTicketStatusBody>;
}, TContext>;
/**
 * @summary Post an admin reply on a ticket
 */
export declare const getAdminPostTicketMessageUrl: (id: string) => string;
export declare const adminPostTicketMessage: (id: string, postTicketMessageRequest: PostTicketMessageRequest, options?: RequestInit) => Promise<TicketMessage>;
export declare const getAdminPostTicketMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminPostTicketMessage>>, TError, {
        id: string;
        data: BodyType<PostTicketMessageRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminPostTicketMessage>>, TError, {
    id: string;
    data: BodyType<PostTicketMessageRequest>;
}, TContext>;
export type AdminPostTicketMessageMutationResult = NonNullable<Awaited<ReturnType<typeof adminPostTicketMessage>>>;
export type AdminPostTicketMessageMutationBody = BodyType<PostTicketMessageRequest>;
export type AdminPostTicketMessageMutationError = ErrorType<unknown>;
/**
* @summary Post an admin reply on a ticket
*/
export declare const useAdminPostTicketMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminPostTicketMessage>>, TError, {
        id: string;
        data: BodyType<PostTicketMessageRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminPostTicketMessage>>, TError, {
    id: string;
    data: BodyType<PostTicketMessageRequest>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map