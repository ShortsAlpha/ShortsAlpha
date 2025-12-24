import axios from 'axios';

const LEMON_API_URL = 'https://api.lemonsqueezy.com/v1';

export const lemonClient = axios.create({
    baseURL: LEMON_API_URL,
    headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
    }
});

export interface CheckoutOptions {
    variantId: string;
    userId: string;
    redirectUrl?: string; // Success URL
}

export const createCheckout = async ({ variantId, userId, redirectUrl }: CheckoutOptions) => {
    console.log("Creating checkout for", variantId, userId);
    try {
        const payload = {
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        custom: {
                            userId: userId,
                        },
                    },
                    product_options: {
                        redirect_url: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/studio?success=true`,
                    }
                },
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: process.env.LEMONSQUEEZY_STORE_ID?.toString()
                        }
                    },
                    variant: {
                        data: {
                            type: 'variants',
                            id: variantId.toString()
                        }
                    }
                }
            }
        };

        const response = await lemonClient.post('/checkouts', payload);
        return response.data;
    } catch (error: any) {
        console.error('Lemon Squeezy Checkout Error:', error?.response?.data || error);
        throw new Error(JSON.stringify(error?.response?.data?.errors || error.message));
    }
};
