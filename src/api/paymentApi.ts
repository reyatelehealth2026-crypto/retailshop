import { apiClient } from './client';

interface UploadPaymentSlipResponse {
  orderNo: string;
  paymentStatus: string;
  paymentSlipPath: string;
}

export const uploadPaymentSlip = async (payload: {
  orderNo: string;
  imageBase64: string;
  filename?: string;
  reference?: string;
}): Promise<UploadPaymentSlipResponse> => {
  const response = await apiClient.post<UploadPaymentSlipResponse>('/payment/slip', payload);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to upload payment slip');
  }

  return response.data;
};

export const paymentApi = {
  uploadPaymentSlip,
};

export default paymentApi;
