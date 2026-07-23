export type Collection = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  longDescription?: string | null;
  imageUrl?: string | null;
  campaignImageUrl?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  productCount: number;
};
