import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  items: string[];
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  toggleItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (id) => set((s) => ({ items: s.items.includes(id) ? s.items : [...s.items, id] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i !== id) })),
      toggleItem: (id) =>
        set((s) => ({
          items: s.items.includes(id)
            ? s.items.filter((i) => i !== id)
            : [...s.items, id],
        })),
      isInWishlist: (id) => get().items.includes(id),
      clear: () => set({ items: [] }),
    }),
    { name: "swoosh-wishlist" }
  )
);
