import apiClient from '@/lib/axios';

// Generic API Service - You can add more services here
// Example: Contacts, Cards, etc.

export const apiService = {

  // Get all cards
  getAllCards: async () => {
    const response = await apiClient.get('/card/all');
    return response.data;
  },

  // Example: Get cards
  getCards: async () => {
    const response = await apiClient.get('/cards');
    return response.data;
  },

  // Create card
  // POST /card/create
  createCard: async (cardData: {
    cardTitle?: string;
    cardColor?: string;
    logo?: string;
    profile?: string;
    cover?: string;
    imagesAndLayouts?: { layout?: string } | null;
    isFavorite?: boolean;
    personalInfo: {
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      phoneNumber: string; // Required
      email?: string;
      company?: string;
      image?: string;
      logo?: string;
      note?: string;
      banner?: string;
      profile_img?: string;
      middleName?: string;
      prefix?: string;
      suffix?: string;
      pronoun?: string;
      preferred?: string;
      maidenName?: string;
    };
    socialLinks?: {
      links: Array<{ type: string; url: string }>;
    };
    qrCode?: string;
    qrImage?: string;
    setting?: any;
  }) => {
    const response = await apiClient.post('/card/create', cardData);
    return response.data;
  },

  // Scan QR code and fetch card
  // GET /scan/:cardId
  scanCard: async (
    cardId: string,
    source: 'qr' | 'link' = 'qr',
    locationData?: {
      latitude?: number;
      longitude?: number;
      city?: string;
      country?: string;
      street?: string;
      district?: string;
      region?: string;
      postalCode?: string;
      name?: string;
      formattedAddress?: string;
    }
  ) => {
    const params = new URLSearchParams();
    params.append('source', source);

    if (locationData) {
      if (locationData.latitude !== undefined) params.append('latitude', locationData.latitude.toString());
      if (locationData.longitude !== undefined) params.append('longitude', locationData.longitude.toString());
      if (locationData.city) params.append('city', locationData.city);
      if (locationData.country) params.append('country', locationData.country);
      if (locationData.street) params.append('street', locationData.street);
      if (locationData.district) params.append('district', locationData.district);
      if (locationData.region) params.append('region', locationData.region);
      if (locationData.postalCode) params.append('postalCode', locationData.postalCode);
      if (locationData.name) params.append('addressName', locationData.name);
      if (locationData.formattedAddress) params.append('formattedAddress', locationData.formattedAddress);
    }

    const response = await apiClient.get(`/scan/${cardId}?${params.toString()}`);
    return response.data;
  },

  // Create contact without cardId (manual / paper card)
  createContact: async (contactData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    company?: string;
    jobTitle?: string;
    note?: string;
    whereMet?: string;
    profile_img?: string;
    city?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    const response = await apiClient.post('/contacts/create', contactData);
    return response.data;
  },

  // Save contact from scanned card
  saveContact: async (cardId: string, contactData?: any) => {
    const response = await apiClient.post(`/contacts/save/${cardId}`, contactData || {});
    return response.data;
  },

  // Get all contacts
  getAllContacts: async () => {
    const response = await apiClient.get('/contacts/all');
    return response.data;
  },

  // Update contact
  updateContact: async (contactId: string, contactData: any) => {
    const response = await apiClient.put(`/contacts/update/${contactId}`, contactData);
    return response.data;
  },

  // Delete contact
  deleteContact: async (contactId: string) => {
    const response = await apiClient.delete(`/contacts/delete/${contactId}`);
    return response.data;
  },

  // Update card
  // PUT /card/update/:id
  updateCard: async (
    cardId: string,
    cardData: {
      cardTitle?: string;
      cardColor?: string;
      logo?: string | null;
      profile?: string | null;
      cover?: string | null;
      imagesAndLayouts?: { layout?: string } | null;
      isFavorite?: boolean;
      personalInfo?: {
        firstName?: string;
        lastName?: string;
        jobTitle?: string;
        phoneNumber?: string;
        email?: string;
        company?: string;
        image?: string;
        logo?: string;
        note?: string;
        banner?: string;
        profile_img?: string;
        middleName?: string;
        prefix?: string;
        suffix?: string;
        pronoun?: string;
        preferred?: string;
        maidenName?: string;
      };
      socialLinks?: {
        links: Array<{ type: string; url: string }>;
      };
    }
  ) => {
    const response = await apiClient.put(`/card/update/${cardId}`, cardData);
    return response.data;
  },

  // Delete card
  // DELETE /card/delete/:id
  deleteCard: async (cardId: string) => {
    const response = await apiClient.delete(`/card/delete/${cardId}`);
    return response.data;
  },

  // Visitor shares their contact with Owner
  shareVisitorContact: async (
    ownerCardId: string,
    visitorCardId: string,
    scanLocation?: {
      latitude?: number;
      longitude?: number;
      city?: string;
      country?: string;
      street?: string;
      district?: string;
      region?: string;
      postalCode?: string;
      name?: string;
      formattedAddress?: string;
    }
  ) => {
    const response = await apiClient.post('/contacts/visitor/share-contact', {
      ownerCardId,
      visitorCardId,
      scanLocation,
    });
    return response.data;
  },

  // ✅ Step 5: Owner gets pending visitor shares
  getPendingVisitorShares: async () => {
    const response = await apiClient.get('/contacts/visitor/pending-shares');
    return response.data;
  },

  // ✅ Step 6: Owner approves visitor share
  approveVisitorShare: async (shareId: string) => {
    const response = await apiClient.post(`/contacts/visitor/approve-share/${shareId}`);
    return response.data;
  },

  // ✅ Step 6: Owner rejects visitor share
  rejectVisitorShare: async (shareId: string) => {
    const response = await apiClient.post(`/contacts/visitor/reject-share/${shareId}`);
    return response.data;
  },
};

