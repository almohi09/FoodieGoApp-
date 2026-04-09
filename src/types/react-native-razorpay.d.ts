declare module 'react-native-razorpay' {
  interface RazorpaySuccess {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name?: string;
    description?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
    method?: {
      upi?: boolean;
      card?: boolean;
      netbanking?: boolean;
      wallet?: boolean;
      emi?: boolean;
      paylater?: boolean;
    };
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccess>;
  };

  export default RazorpayCheckout;
}
