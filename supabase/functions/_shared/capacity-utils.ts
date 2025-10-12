/**
 * Centralized capacity calculation utilities for accurate vehicle capacity management
 */

export interface Booking {
  id: string;
  estimated_weight: number;
  window_start: string;
  window_end: string;
  vehicle_assignments?: Array<{ vehicle_id: string }>;
}

export interface Vehicle {
  id: string;
  name: string;
  capacity_lbs: number;
  active: boolean;
}

export interface TimeWindow {
  start: string;
  end: string;
  display: string;
}

export interface VehicleCapacity {
  total: number;
  used: number;
  remaining: number;
  name: string;
}

/**
 * Calculate the weight contribution of a booking to a specific time window
 * Uses time-weighted overlap calculation for accurate capacity management
 */
export function calculateOverlapWeight(booking: Booking, window: TimeWindow): number {
  const bookingStart = new Date(booking.window_start);
  const bookingEnd = new Date(booking.window_end);
  const windowStart = new Date(window.start);
  const windowEnd = new Date(window.end);

  // Calculate overlap period
  const overlapStart = new Date(Math.max(bookingStart.getTime(), windowStart.getTime()));
  const overlapEnd = new Date(Math.min(bookingEnd.getTime(), windowEnd.getTime()));

  // No overlap
  if (overlapStart >= overlapEnd) {
    return 0;
  }

  // Calculate overlap duration as percentage of booking duration
  const bookingDuration = bookingEnd.getTime() - bookingStart.getTime();
  const overlapDuration = overlapEnd.getTime() - overlapStart.getTime();
  const overlapPercentage = overlapDuration / bookingDuration;

  // Return weighted weight (percentage of booking weight that overlaps with window)
  return booking.estimated_weight * overlapPercentage;
}

/**
 * Calculate vehicle capacity for a specific time window
 * Accounts for overlapping bookings with time-weighted calculations
 */
export function calculateVehicleCapacityForWindow(
  vehicles: Vehicle[],
  existingBookings: Booking[],
  window: TimeWindow
): Record<string, VehicleCapacity> {
  const capacities: Record<string, VehicleCapacity> = {};

  vehicles.forEach(vehicle => {
    if (!vehicle.active) return;

    let usedCapacity = 0;

    // Calculate used capacity from overlapping bookings
    existingBookings.forEach(booking => {
      if (booking.vehicle_assignments?.some(va => va.vehicle_id === vehicle.id)) {
        const overlapWeight = calculateOverlapWeight(booking, window);
        usedCapacity += overlapWeight;
      }
    });

    capacities[vehicle.id] = {
      total: vehicle.capacity_lbs,
      used: usedCapacity,
      remaining: vehicle.capacity_lbs - usedCapacity,
      name: vehicle.name
    };
  });

  return capacities;
}

/**
 * Find the best vehicle for a booking based on capacity and efficiency
 * Considers remaining capacity, utilization rate, and other factors
 */
export function findBestVehicle(
  vehicleCapacities: Record<string, VehicleCapacity>,
  requiredWeight: number
): { id: string; capacity: VehicleCapacity } | null {
  const availableVehicles = Object.entries(vehicleCapacities)
    .filter(([_, capacity]) => capacity.remaining >= requiredWeight)
    .map(([id, capacity]) => ({ id, capacity }));

  if (availableVehicles.length === 0) {
    return null;
  }

  // Sort by utilization rate (higher utilization is better for efficiency)
  // but ensure we have enough capacity
  return availableVehicles.sort((a, b) => {
    const aUtilization = a.capacity.used / a.capacity.total;
    const bUtilization = b.capacity.used / b.capacity.total;
    return bUtilization - aUtilization;
  })[0];
}

/**
 * Validate if a booking can be accommodated in the given time window
 * Returns validation result with best vehicle recommendation
 */
export function validateBookingCapacity(
  vehicles: Vehicle[],
  existingBookings: Booking[],
  window: TimeWindow,
  requiredWeight: number
): {
  canAccommodate: boolean;
  bestVehicle?: { id: string; capacity: VehicleCapacity };
  reason?: string;
} {
  const vehicleCapacities = calculateVehicleCapacityForWindow(vehicles, existingBookings, window);
  const bestVehicle = findBestVehicle(vehicleCapacities, requiredWeight);

  if (!bestVehicle) {
    return {
      canAccommodate: false,
      reason: `No vehicle with sufficient capacity (${requiredWeight} lbs) available for this time window`
    };
  }

  return {
    canAccommodate: true,
    bestVehicle
  };
}