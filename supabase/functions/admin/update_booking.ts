Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { 
            booking_id,
            action, // 'update', 'reschedule', 'assign_vehicle', 'change_status', 'bulk_update'
            updates,
            bulk_booking_ids,
            reason,
            notify_customer = true
        } = await req.json();

        console.log('Admin update booking request:', { booking_id, action, updates, bulk_booking_ids, reason });

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Validate required parameters
        if (!action) {
            throw new Error('Action is required');
        }

        if (action !== 'bulk_update' && !booking_id) {
            throw new Error('Booking ID is required for single booking actions');
        }

        if (action === 'bulk_update' && (!bulk_booking_ids || bulk_booking_ids.length === 0)) {
            throw new Error('Booking IDs are required for bulk updates');
        }

        const bookingIds = action === 'bulk_update' ? bulk_booking_ids : [booking_id];

        // Get current booking data for audit trail
        const getBookingsQuery = `select=*&id=in.(${bookingIds.join(',')})`;
        const currentBookingsResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${getBookingsQuery}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!currentBookingsResponse.ok) {
            throw new Error('Failed to fetch current booking data');
        }

        const currentBookings = await currentBookingsResponse.json();
        const results = [];

        for (const currentBooking of currentBookings) {
            let updateData = {};
            let notificationData = null;

            // Process different actions
            switch (action) {
                case 'update':
                    updateData = { ...updates };
                    break;

                case 'reschedule':
                    if (!updates.window_start || !updates.window_end) {
                        throw new Error('New time window is required for rescheduling');
                    }
                    
                    // Check for conflicts in new time slot
                    const conflictQuery = `select=id&window_start=lte.${updates.window_end}&window_end=gte.${updates.window_start}&status=in.(confirmed,pending)&id=neq.${currentBooking.id}`;
                    const conflictResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?${conflictQuery}`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (conflictResponse.ok) {
                        const conflicts = await conflictResponse.json();
                        if (conflicts.length > 0) {
                            throw new Error(`Time slot conflict detected with booking(s): ${conflicts.map(c => c.id).join(', ')}`);
                        }
                    }
                    
                    updateData = {
                        window_start: updates.window_start,
                        window_end: updates.window_end,
                        status: 'confirmed'
                    };
                    
                    notificationData = {
                        type: 'reschedule',
                        subject: 'Booking Rescheduled',
                        message: `Your booking has been rescheduled to ${new Date(updates.window_start).toLocaleString()}. ${reason || ''}`.trim()
                    };
                    break;

                case 'assign_vehicle':
                    if (!updates.vehicle_id) {
                        throw new Error('Vehicle ID is required for vehicle assignment');
                    }
                    
                    // Verify vehicle capacity
                    const vehicleResponse = await fetch(`${supabaseUrl}/rest/v1/vehicles?select=*&id=eq.${updates.vehicle_id}`, {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (!vehicleResponse.ok) {
                        throw new Error('Failed to fetch vehicle information');
                    }
                    
                    const vehicles = await vehicleResponse.json();
                    if (vehicles.length === 0) {
                        throw new Error('Vehicle not found');
                    }
                    
                    const vehicle = vehicles[0];
                    if (parseFloat(currentBooking.estimated_weight) > vehicle.capacity_lbs) {
                        throw new Error(`Booking weight (${currentBooking.estimated_weight} lbs) exceeds vehicle capacity (${vehicle.capacity_lbs} lbs)`);
                    }
                    
                    updateData = {
                        assigned_vehicle_id: updates.vehicle_id,
                        status: currentBooking.status === 'pending' ? 'confirmed' : currentBooking.status
                    };
                    break;

                case 'change_status':
                    if (!updates.status) {
                        throw new Error('New status is required');
                    }
                    
                    updateData = { status: updates.status };
                    
                    // Create appropriate notification based on status
                    if (updates.status === 'confirmed') {
                        notificationData = {
                            type: 'confirmation',
                            subject: 'Booking Confirmed',
                            message: `Your booking has been confirmed. ${reason || ''}`.trim()
                        };
                    } else if (updates.status === 'cancelled') {
                        notificationData = {
                            type: 'cancellation',
                            subject: 'Booking Cancelled',
                            message: `Your booking has been cancelled. ${reason || 'Please contact us if you have questions.'}`.trim()
                        };
                    } else if (updates.status === 'completed') {
                        notificationData = {
                            type: 'completion',
                            subject: 'Service Completed',
                            message: `Your service has been completed successfully. ${reason || 'Thank you for choosing QCS Cargo!'}`.trim()
                        };
                    }
                    break;

                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            // Add common update fields
            updateData.updated_at = new Date().toISOString();
            if (updates.internal_notes) {
                updateData.internal_notes = updates.internal_notes;
            }
            if (updates.priority_level) {
                updateData.priority_level = updates.priority_level;
            }
            if (updates.assigned_to) {
                updateData.assigned_to = updates.assigned_to;
            }

            // Update the booking
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${currentBooking.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.error('Failed to update booking:', errorText);
                throw new Error(`Failed to update booking ${currentBooking.id}: ${errorText}`);
            }

            const updatedBooking = await updateResponse.json();

            // Log admin action in audit trail
            const auditData = {
                admin_user_id: '00000000-0000-0000-0000-000000000000', // Will be replaced by actual admin user from JWT
                action_type: `booking_${action}`,
                table_name: 'bookings',
                record_id: currentBooking.id,
                old_values: currentBooking,
                new_values: updatedBooking[0]
            };

            const auditResponse = await fetch(`${supabaseUrl}/rest/v1/admin_audit_log`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(auditData)
            });

            if (!auditResponse.ok) {
                console.error('Failed to create audit log entry');
            }

            // Send customer notification if requested
            if (notify_customer && notificationData && currentBooking.customer_id) {
                const notificationLog = {
                    booking_id: currentBooking.id,
                    customer_id: currentBooking.customer_id,
                    notification_type: 'email',
                    subject: notificationData.subject,
                    message: notificationData.message,
                    sent_at: new Date().toISOString(),
                    delivery_status: 'sent' // In real implementation, this would be 'pending' until confirmed
                };

                const notificationResponse = await fetch(`${supabaseUrl}/rest/v1/notifications_log`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notificationLog)
                });

                if (!notificationResponse.ok) {
                    console.error('Failed to log notification');
                }
            }

            results.push({
                booking_id: currentBooking.id,
                success: true,
                updated_booking: updatedBooking[0],
                changes_made: Object.keys(updateData),
                notification_sent: notify_customer && notificationData ? true : false
            });
        }

        const result = {
            data: {
                action_performed: action,
                results,
                total_updated: results.length,
                success_count: results.filter(r => r.success).length,
                reason_provided: reason || null
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin update booking error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_UPDATE_BOOKING_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});