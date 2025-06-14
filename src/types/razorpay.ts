// Custom TypeScript types for Razorpay
export interface RazorpayOptions {
    key: string;
    amount: number;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    order_id?: string;
    handler: (response: RazorpayPaymentResponse) => void;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, any>;
    theme?: {
      color?: string;
    };
    modal?: {
      ondismiss?: () => void;
    };
  }
  
  export interface RazorpayPaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }
  
  export interface RazorpayInstance {
    open(): void;
    close(): void;
    on(event: string, handler: (response: any) => void): void;
  }
  
  export interface RazorpayConstructor {
    new (options: RazorpayOptions): RazorpayInstance;
  }
  
  declare global {
    interface Window {
      Razorpay: RazorpayConstructor;
    }
  }
  
  export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    offer_id: string | null;
    status: 'created' | 'attempted' | 'paid';
    attempts: number;
    notes: Record<string, any>;
    created_at: number;
  }
  
  export interface CreateOrderData {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, any>;
  }