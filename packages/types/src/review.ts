export type Review = {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string | null;
  body: string;
  isApproved: boolean;
  createdAt: string;
};
