/**
 * Capacity calculation utilities for proper time window overlap handling
 */

export interface Booking {
  id: string;
  window_start: string;
  window_end: string;
  estimated_weight: number;
  vehicle_assignments?: Array<{
    vehicle_id: string;
  }>;
}

export interface Vehicle {
  id: string;
  capacity_lbs: number;
  name: string;
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
 * Calculate the actual weight that should be counted for a booking
 * within a specific time window, accounting for partial overlaps
 */
export function calculateOverlapWeight(
  booking: Booking,
  window: TimeWindow
): number {
  const bookingStart = new Date(booking.window_start);
  const bookingEnd = new Date(booking.window_end);
  const windowStart = new Date(window.start);
  const windowEnd = new Date(window.end);

  // Calculate overlap duration
  const overlapStart = new Date(Math.max(bookingStart.getTime(), windowStart.getTime()));
  const overlapEnd = new Date(Math.min(bookingEnd.getTime(), windowEnd.getTime()));
  
  if (overlapStart >= overlapEnd) {
    return 0; // No overlap
  }

  const overlapDuration = overlapEnd.getTime() - overlapStart.getTime();
  const bookingDuration = bookingEnd.getTime() - bookingStart.getTime();
  
  // Calculate proportional weight based on overlap percentage
  const overlapPercentage = overlapDuration / bookingDuration;
  return booking.estimated_weight * overlapPercentage;
}

/**
 * Calculate vehicle capacity for a specific time window
 * Properly handles overlapping bookings with time-weighted calculations
 */
export function calculateVehicleCapacityForWindow(
  vehicles: Vehicle[],
  bookings: Booking[],
  window: TimeWindow
): Record<string, VehicleCapacity> {
  const vehicleCapacity: Record<string, VehicleCapacity> = {};
  
  // Initialize vehicle capacities
  vehicles.forEach(vehicle => {
    vehicleCapacity[vehicle.id] = {
      total: vehicle.capacity_lbs,
      used: 0,
      remaining: vehicle.capacity_lbs,
      name: vehicle.name
    };
  });

  // Calculate used capacity with proper overlap handling
  bookings.forEach(booking => {
    if (booking.vehicle_assignments && booking.vehicle_assignments.length > 0) {
      const assignment = booking.vehicle_assignments[0];
      if (assignment.vehicle_id && vehicleCapacity[assignment.vehicle_id]) {
        // Calculate the actual weight that overlaps with this window
        const overlapWeight = calculateOverlapWeight(booking, window);
        vehicleCapacity[assignment.vehicle_id].used += overlapWeight;
        vehicleCapacity[assignment.vehicle_id].remaining -= overlapWeight;
      }
    }
  });

  return vehicleCapacity;
}

/**
 * Find the best vehicle for a booking based on multiple criteria
 */
export function findBestVehicle(
  vehicleCapacity: Record<string, VehicleCapacity>,
  requiredWeight: number,
  vehiclePreferences?: {
    preferredVehicleIds?: string[];
    avoidVehicleIds?: string[];
  }
): { id: string; capacity: VehicleCapacity } | null {
  const availableVehicles = Object.entries(vehicleCapacity)
    .filter(([_, capacity]) => capacity.remaining >= requiredWeight)
    .map(([id, capacity]) => ({ id, capacity }));

  if (availableVehicles.length === 0) {
    return null;
  }

  // Apply preferences
  let filteredVehicles = availableVehicles;
  
  if (vehiclePreferences?.preferredVehicleIds) {
    const preferred = availableVehicles.filter(v => 
      vehiclePreferences.preferredVehicleIds!.includes(v.id)
    );
    if (preferred.length > 0) {
      filteredVehicles = preferred;
    }
  }

  if (vehiclePreferences?.avoidVehicleIds) {
    filteredVehicles = filteredVehicles.filter(v => 
      !vehiclePreferences.avoidVehicleIds!.includes(v.id)
    );
  }

  // Sort by efficiency (capacity utilization) rather than just remaining capacity
  filteredVehicles.sort((a, b) => {
    const aUtilization = a.capacity.used / a.capacity.total;
    const bUtilization = b.capacity.used / b.capacity.total;
    
    // Prefer vehicles with better utilization (closer to optimal capacity)
    // but still with enough remaining capacity
    const aEfficiency = aUtilization + (a.capacity.remaining / a.capacity.total) * 0.5;
    const bEfficiency = bUtilization + (b.capacity.remaining / b.capacity.total) * 0.5;
    
    return bEfficiency - aEfficiency;
  });

  return filteredVehicles[0] || null;
}

/**
 * Validate that a booking can be accommodated in a time window
 */
export function validateBookingCapacity(
  vehicles: Vehicle[],
  existingBookings: Booking[],
  window: TimeWindow,
  requiredWeight: number
): { canAccommodate: boolean; bestVehicle?: { id: string; capacity: VehicleCapacity }; reason?: string } {
  const vehicleCapacity = calculateVehicleCapacityForWindow(vehicles, existingBookings, window);
  const bestVehicle = findBestVehicle(vehicleCapacity, requiredWeight);

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
