export interface BrandingAddress {
  line1: string;
  line2: string;
  postTown: string;
  county: string;
  postCode: string;
}

export interface BrandingContact {
  name: string;
  phone: string;
  email: string;
}

export interface BrandingMap {
  latitude: number;
  longitude: number;
}

export interface Branding {
  name: string;
  description: string;
  directions: string;
  logoUrl: string;
  map: BrandingMap;
  address: BrandingAddress;
  contact: BrandingContact;
}
