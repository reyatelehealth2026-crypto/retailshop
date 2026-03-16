import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/api/orderApi';
import { paymentApi } from '@/api/paymentApi';
import type { CreateOrderRequest, OrderStatus } from '@/types/order';

const ORDERS_QUERY_KEY = 'orders';

export const useOrders = (page: number = 1, limit: number = 10, status?: OrderStatus) => {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, page, limit, status],
    queryFn: () => orderApi.getOrders({ page, limit, status }),
  });
};

export const useOrder = (orderNo: string) => {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'detail', orderNo],
    queryFn: () => orderApi.getOrderByNumber(orderNo),
    enabled: !!orderNo,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderRequest) => orderApi.createOrder(data),
    onSuccess: () => {
      // Invalidate cart and orders queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderNo, reason }: { orderNo: string; reason?: string }) =>
      orderApi.cancelOrder(orderNo, reason),
    onSuccess: (_: void, variables: { orderNo: string; reason?: string }) => {
      queryClient.invalidateQueries({
        queryKey: [ORDERS_QUERY_KEY, 'detail', variables.orderNo],
      });
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
  });
};

export const useUploadPaymentProof = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderNo, imageBase64, filename, reference }: { orderNo: string; imageBase64: string; filename?: string; reference?: string }) =>
      paymentApi.uploadPaymentSlip({ orderNo, imageBase64, filename, reference }),
    onSuccess: (_: { orderNo: string; paymentStatus: string; paymentSlipPath: string }, variables: { orderNo: string; imageBase64: string; filename?: string; reference?: string }) => {
      queryClient.invalidateQueries({
        queryKey: [ORDERS_QUERY_KEY, 'detail', variables.orderNo],
      });
    },
  });
};

export const useTrackingInfo = (orderNo: string) => {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'tracking', orderNo],
    queryFn: async () => {
      // TODO: Implement in API
      throw new Error('Not implemented');
    },
    enabled: !!orderNo,
  });
};

export const useReorder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderNo: string) => {
      // TODO: Implement in API
      console.log('Reorder:', orderNo);
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
  });
};
