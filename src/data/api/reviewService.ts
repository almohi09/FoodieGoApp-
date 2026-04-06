import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.foodiego.in/api/v1';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  restaurantId: string;
  orderId: string;
  rating: number;
  foodRating?: number;
  deliveryRating?: number;
  comment?: string;
  photos?: string[];
  createdAt: string;
  helpful: number;
  isVerified: boolean;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  foodRating: number;
  deliveryRating: number;
  ambienceRating?: number;
  breakdown: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
}

export interface CreateReviewData {
  orderId: string;
  rating: number;
  foodRating?: number;
  deliveryRating?: number;
  comment?: string;
  photos?: string[];
}

class ReviewService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(async config => {
      if (!this.token) {
        this.token = await AsyncStorage.getItem('auth_token');
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  async getRestaurantReviews(
    restaurantId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: 'recent' | 'highest' | 'lowest' | 'helpful';
      rating?: number;
    } = {},
  ): Promise<{
    success: boolean;
    reviews?: Review[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/reviews`,
        {
          params: {
            page: options.page || 1,
            limit: options.limit || 20,
            sortBy: options.sortBy || 'recent',
            rating: options.rating,
          },
        },
      );
      return {
        success: true,
        reviews: response.data.reviews,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch reviews',
      };
    }
  }

  async getRatingSummary(restaurantId: string): Promise<{
    success: boolean;
    summary?: RatingSummary;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/ratings`,
      );
      return { success: true, summary: response.data };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch rating summary',
      };
    }
  }

  async createReview(data: CreateReviewData): Promise<{
    success: boolean;
    review?: Review;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/reviews', data);
      return { success: true, review: response.data.review };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit review',
      };
    }
  }

  async updateReview(
    reviewId: string,
    data: Partial<CreateReviewData>,
  ): Promise<{
    success: boolean;
    review?: Review;
    error?: string;
  }> {
    try {
      const response = await this.api.put(`/reviews/${reviewId}`, data);
      return { success: true, review: response.data.review };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update review',
      };
    }
  }

  async deleteReview(reviewId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.delete(`/reviews/${reviewId}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete review',
      };
    }
  }

  async markHelpful(reviewId: string): Promise<{
    success: boolean;
    newHelpfulCount?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.post(`/reviews/${reviewId}/helpful`);
      return { success: true, newHelpfulCount: response.data.helpful };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to mark helpful',
      };
    }
  }

  async reportReview(
    reviewId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/reviews/${reviewId}/report`, { reason });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to report review',
      };
    }
  }

  async getReviewPhotos(
    restaurantId: string,
    page: number = 1,
  ): Promise<{
    success: boolean;
    photos?: { url: string; reviewId: string; caption?: string }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/review-photos`,
        {
          params: { page },
        },
      );
      return { success: true, photos: response.data.photos };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch photos',
      };
    }
  }

  async getUserReviews(
    userId: string,
    page: number = 1,
  ): Promise<{
    success: boolean;
    reviews?: Review[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/reviews/user', {
        params: { userId, page },
      });
      return {
        success: true,
        reviews: response.data.reviews,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user reviews',
      };
    }
  }

  async canReviewOrder(orderId: string): Promise<{
    success: boolean;
    canReview: boolean;
    message?: string;
  }> {
    try {
      const response = await this.api.get(`/orders/${orderId}/can-review`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        canReview: false,
        message: error.response?.data?.message || 'Unable to check',
      };
    }
  }
}

export const reviewService = new ReviewService();
export default reviewService;
