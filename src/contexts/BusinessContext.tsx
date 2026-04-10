"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  Business,
  BusinessWithRole,
  BusinessRole,
  Location,
  LocationWithRole,
  LocationRole,
} from "@/types/business";

// Storage key for selected business
const SELECTED_BUSINESS_KEY = "stocker_selected_business";
const SELECTED_LOCATION_KEY = "stocker_selected_location";

// ============================================
// Context Types
// ============================================

interface BusinessContextType {
  // Business state
  businesses: BusinessWithRole[];
  selectedBusiness: BusinessWithRole | null;
  isLoadingBusinesses: boolean;
  businessesError: string | null;

  // Location state
  locations: LocationWithRole[];
  selectedLocation: LocationWithRole | null;
  isLoadingLocations: boolean;
  locationsError: string | null;

  // Business actions
  fetchBusinesses: () => Promise<void>;
  selectBusiness: (business: BusinessWithRole | null) => void;
  clearBusinessError: () => void;

  // Location actions
  fetchLocations: (businessId: string) => Promise<void>;
  selectLocation: (location: LocationWithRole | null) => void;
  clearLocationError: () => void;

  // Utility
  hasBusinessAccess: (businessId: string) => boolean;
  hasLocationAccess: (locationId: string) => boolean;
  getBusinessRole: (businessId: string) => BusinessRole | null;
  getLocationRole: (locationId: string) => LocationRole | null;
  isBusinessOwner: (businessId: string) => boolean;
  isLocationManager: (locationId: string) => boolean;
}

// ============================================
// Context Creation
// ============================================

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// ============================================
// Provider Props
// ============================================

interface BusinessProviderProps {
  children: ReactNode;
}

// ============================================
// Business Provider
// ============================================

export function BusinessProvider({ children }: BusinessProviderProps) {
  // Business state
  const [businesses, setBusinesses] = useState<BusinessWithRole[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithRole | null>(null);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [businessesError, setBusinessesError] = useState<string | null>(null);

  // Location state
  const [locations, setLocations] = useState<LocationWithRole[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithRole | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // ============================================
  // Business Methods
  // ============================================

  const fetchBusinesses = useCallback(async () => {
    setIsLoadingBusinesses(true);
    setBusinessesError(null);

    try {
      const res = await fetch("/api/businesses");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar negocios");
      }

      setBusinesses(data.businesses || []);

      // Auto-select business from localStorage or first business
      const savedBusinessId = localStorage.getItem(SELECTED_BUSINESS_KEY);
      let businessToSelect: BusinessWithRole | null = null;

      if (savedBusinessId && data.businesses?.length > 0) {
        businessToSelect = data.businesses.find(
          (b: BusinessWithRole) => b.id === savedBusinessId
        ) || data.businesses[0];
      } else if (data.businesses?.length > 0) {
        businessToSelect = data.businesses[0];
      }

      if (businessToSelect) {
        setSelectedBusiness(businessToSelect);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      setBusinessesError(error instanceof Error ? error.message : "Error al cargar negocios");
    } finally {
      setIsLoadingBusinesses(false);
    }
  }, []);

  const selectBusiness = useCallback((business: BusinessWithRole | null) => {
    setSelectedBusiness(business);
    setSelectedLocation(null); // Reset location when business changes
    setLocations([]);

    if (business) {
      localStorage.setItem(SELECTED_BUSINESS_KEY, business.id);
    } else {
      localStorage.removeItem(SELECTED_BUSINESS_KEY);
    }

    // Clear selected location from localStorage
    localStorage.removeItem(SELECTED_LOCATION_KEY);
  }, []);

  const clearBusinessError = useCallback(() => {
    setBusinessesError(null);
  }, []);

  // ============================================
  // Location Methods
  // ============================================

  const fetchLocations = useCallback(async (businessId: string) => {
    setIsLoadingLocations(true);
    setLocationsError(null);

    try {
      const res = await fetch(`/api/businesses/${businessId}/locations`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar ubicaciones");
      }

      setLocations(data.locations || []);

      // Auto-select location from localStorage or first location
      const savedLocationId = localStorage.getItem(SELECTED_LOCATION_KEY);
      let locationToSelect: LocationWithRole | null = null;

      if (savedLocationId && data.locations?.length > 0) {
        locationToSelect = data.locations.find(
          (l: LocationWithRole) => l.id === savedLocationId
        ) || data.locations[0];
      } else if (data.locations?.length > 0) {
        locationToSelect = data.locations[0];
      }

      if (locationToSelect) {
        setSelectedLocation(locationToSelect);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocationsError(error instanceof Error ? error.message : "Error al cargar ubicaciones");
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  const selectLocation = useCallback((location: LocationWithRole | null) => {
    setSelectedLocation(location);

    if (location) {
      localStorage.setItem(SELECTED_LOCATION_KEY, location.id);
    } else {
      localStorage.removeItem(SELECTED_LOCATION_KEY);
    }
  }, []);

  const clearLocationError = useCallback(() => {
    setLocationsError(null);
  }, []);

  // ============================================
  // Utility Methods
  // ============================================

  const hasBusinessAccess = useCallback(
    (businessId: string): boolean => {
      return businesses.some((b) => b.id === businessId);
    },
    [businesses]
  );

  const hasLocationAccess = useCallback(
    (locationId: string): boolean => {
      return locations.some((l) => l.id === locationId);
    },
    [locations]
  );

  const getBusinessRole = useCallback(
    (businessId: string): BusinessRole | null => {
      const business = businesses.find((b) => b.id === businessId);
      return business?.role || null;
    },
    [businesses]
  );

  const getLocationRole = useCallback(
    (locationId: string): LocationRole | null => {
      const location = locations.find((l) => l.id === locationId);
      return location?.role || null;
    },
    [locations]
  );

  const isBusinessOwner = useCallback(
    (businessId: string): boolean => {
      return getBusinessRole(businessId) === "OWNER";
    },
    [getBusinessRole]
  );

  const isLocationManager = useCallback(
    (locationId: string): boolean => {
      const role = getLocationRole(locationId);
      return role === "WAREHOUSE_MANAGER" || role === "RESTAURANT_MANAGER";
    },
    [getLocationRole]
  );

  // ============================================
  // Effects
  // ============================================

  // Fetch locations when business changes
  useEffect(() => {
    if (selectedBusiness) {
      fetchLocations(selectedBusiness.id);
    }
  }, [selectedBusiness, fetchLocations]);

  // ============================================
  // Provider Value
  // ============================================

  const value: BusinessContextType = {
    // Business state
    businesses,
    selectedBusiness,
    isLoadingBusinesses,
    businessesError,

    // Location state
    locations,
    selectedLocation,
    isLoadingLocations,
    locationsError,

    // Business actions
    fetchBusinesses,
    selectBusiness,
    clearBusinessError,

    // Location actions
    fetchLocations,
    selectLocation,
    clearLocationError,

    // Utility
    hasBusinessAccess,
    hasLocationAccess,
    getBusinessRole,
    getLocationRole,
    isBusinessOwner,
    isLocationManager,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusinessContext must be used within a BusinessProvider");
  }
  return context;
}

// Default export for convenience
export default BusinessContext;