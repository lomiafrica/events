export interface ImageProps {
  id: number;
  height: string;
  width: string;
  public_id: string;
  format: string;
  url: string; // Sanity image URL
  blurDataUrl?: string;
  tags?: string[];
  /** Gallery/section title from Sanity (e.g. "Event November", "Backstage") */
  title?: string;
}

export interface SharedModalProps {
  index: number;
  images?: ImageProps[];
  currentPhoto?: ImageProps;
  changePhotoId: (newVal: number) => void;
  closeModal: () => void;
  navigation: boolean;
  direction?: number;
}
