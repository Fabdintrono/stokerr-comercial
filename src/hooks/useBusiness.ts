"use client";

import { useCallback, useMemo } from "react";
import { useBusinessContext } from "@/contexts/BusinessContext";
import {
  BusinessWithRole,
  LocationWithRole,
  BusinessRole,
  LocationRole,
} from "@/types/business";

// ============================================
// Hook Return Type
// ============================================

interface UseBusinessReturn {
  // Business data
  businesses: BusinessWithRole[];
  selectedBusiness: BusinessWithRole | null;
  isLoading: boolean;
  error: string | null;

  // Location data
  locations: LocationWithRole[];
  selectedLocation: LocationWithRole | null;
  isLoadingLocations: boolean;
  locationsError: string | null;

  // Business actions
  fetchBusinesses: () => Promise<void>;
  selectBusiness: (business: BusinessWithRole | null) => void;
  clearError: () => void;

  // Location actions
  fetchLocations: (businessId: string) => Promise<void>;
  selectLocation: (location: LocationWithRole | null) => void;
  clearLocationsError: () => void;

  // Computed
  hasBusinesses: boolean;
  hasLocations: boolean;

  // Access checks
  hasBusinessAccess: (businessId: string) => boolean;
  hasLocationAccess: (locationId: string) => boolean;
  getBusinessRole: (businessId: string) => BusinessRole | null;
  getLocationRole: (locationId: string) => LocationRole | null;
  isBusinessOwner: (businessId: string) => boolean;
  isLocationManager: (locationId: string) => boolean;

  // Role checks for current business
  currentBusinessRole: BusinessRole | null;
  currentLocationRole: LocationRole | null;
  isCurrentBusinessOwner: boolean;
  isCurrentLocationManager: boolean;

  // Utility
  canManageBusiness: (businessId?: string) => boolean;
  canManageLocation: (locationId?: string) => boolean;
}

// ============================================
// Hook
// ============================================

export function useBusiness(): UseBusinessReturn {
  const {
    businesses,
    selectedBusiness,
    isLoadingBusinesses,
    businessesError,
    locations,
    selectedLocation,
    isLoadingLocations,
    locationsError,
    fetchBusinesses,
    selectBusiness,
    clearBusinessError,
    fetchLocations,
    selectLocation,
    clearLocationError,
    hasBusinessAccess,
    hasLocationAccess,
    getBusinessRole,
    getLocationRole,
    isBusinessOwner,
    isLocationManager,
  } = useBusinessContext();

  // ============================================
  // Computed Values
  // ============================================

  const hasBusinesses = useMemo(() => businesses.length > 0, [businesses]);
  const hasLocations = useMemo(() => locations.length > 0, [locations]);

  const currentBusinessRole = useMemo(
    () => (selectedBusiness ? getBusinessRole(selectedBusiness.id) : null),
    [selectedBusiness, getBusinessRole]
  );

  const currentLocationRole = useMemo(
    () => (selectedLocation ? getLocationRole(selectedLocation.id) : null),
    [selectedLocation, getLocationRole]
  );

  const isCurrentBusinessOwner = useMemo(
    () => (selectedBusiness ? isBusinessOwner(selectedBusiness.id) : false),
    [selectedBusiness, isBusinessOwner]
  );

  const isCurrentLocationManager = useMemo(
    () => (selectedLocation ? isLocationManager(selectedLocation.id) : false),
    [selectedLocation, isLocationManager]
  );

  // ============================================
  // Permission Helpers
  // ============================================

  const canManageBusiness = useCallback(
    (businessId?: string): boolean => {
      const id = businessId || selectedBusiness?.id;
      if (!id) return false;
      const role = getBusinessRole(id);
      return role === "OWNER" || role === "MANAGER";
    },
    [selectedBusiness, getBusinessRole]
  );

  const canManageLocation = useCallback(
    (locationId?: string): boolean => {
      const id = locationId || selectedLocation?.id;
      if (!id) return false;
      const role = getLocationRole(id);
      // Check if user is business owner (has full access)
      const isOwner = isCurrentBusinessOwner;
      return (
        role === "WAREHOUSE_MANAGER" ||
        role === "RESTAURANT_MANAGER" ||
        isOwner
      );
    },
    [selectedLocation, getLocationRole, isCurrentBusinessOwner]
  );

  // ============================================
  // Return Value
  // ============================================

  return {
    // Business data
    businesses,
    selectedBusiness,
    isLoading: isLoadingBusinesses,
    error: businessesError,

    // Location data
    locations,
    selectedLocation,
    isLoadingLocations,
    locationsError,

    // Business actions
    fetchBusinesses,
    selectBusiness,
    clearError: clearBusinessError,

    // Location actions
    fetchLocations,
    selectLocation,
    clearLocationsError: clearLocationError,

    // Computed
    hasBusinesses,
    hasLocations,

    // Access checks
    hasBusinessAccess,
    hasLocationAccess,
    getBusinessRole,
    getLocationRole,
    isBusinessOwner,
    isLocationManager,

    // Role checks for current
    currentBusinessRole,
    currentLocationRole,
    isCurrentBusinessOwner,
    isCurrentLocationManager,

    // Permission helpers
    canManageBusiness,
    canManageLocation,
  };
}

export default useBusiness;