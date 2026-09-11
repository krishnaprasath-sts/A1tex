export interface ProductItem {
  name: string;
  isHot?: boolean;
  imageUrl?: string;
}

export interface SubCategoryChild {
  name: string;
  href: string;
  isHot?: boolean;
}

export interface SubCategory {
  name: string;
  href?: string;
  imageUrl?: string | null;
  directLink?: boolean;
  childCategories?: SubCategoryChild[];
  products?: ProductItem[];
}

export interface MainCategory {
  label: string;
  href: string;
  isSale?: boolean;
  isHighlighted?: boolean;
  subCategories?: SubCategory[];
}
