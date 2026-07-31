import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    phoneNumber: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phoneNumber: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits').optional(),
    email: z.string().email('Invalid email').optional(),
    password: z.string().min(6, 'Password is required'),
  }).refine(data => data.phoneNumber || data.email, {
    message: "Either phoneNumber or email is required",
    path: ["phoneNumber"]
  }),
});

// Order Schemas
export const createOrderSchema = z.object({
  body: z.object({
    orderItems: z.array(z.object({
      product: z.any(),
      quantity: z.number().positive(),
    })).min(1, 'Order must contain at least one item'),
    shippingAddress: z.object({
      street: z.string().optional(),
      fullAddress: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
    }),
    totalPrice: z.number().min(0, 'Total price cannot be negative'),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    notes: z.string().optional(),
    recipient: z.object({
      isForAnotherPerson: z.boolean().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    }).optional(),
    couponCode: z.string().optional(),
    couponDiscount: z.number().optional(),
  })
});
