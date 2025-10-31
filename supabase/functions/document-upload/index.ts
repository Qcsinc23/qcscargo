import { sendEmail, generateNotificationEmail } from "../_shared/email-utils.ts";

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
        const { fileData, fileName, documentType, shipmentId, description, documentName } = await req.json();

        if (!fileData || !fileName || !documentType) {
            throw new Error('File data, filename, and document type are required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid authentication token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Extract base64 data from data URL
        const base64Data = fileData.split(',')[1];
        const mimeType = fileData.split(';')[0].split(':')[1];

        // Convert base64 to binary
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const uniqueFileName = `${timestamp}-${fileName}`;
        const filePath = shipmentId ? `${shipmentId}/${uniqueFileName}` : `general/${uniqueFileName}`;

        // Upload to Supabase Storage
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/shipment-documents/${filePath}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': mimeType,
                'x-upsert': 'true'
            },
            body: binaryData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/shipment-documents/${filePath}`;

        // Save document metadata to database
        const documentData = {
            shipment_id: shipmentId || null,
            document_type: documentType,
            file_name: fileName,
            file_url: publicUrl,
            file_size: binaryData.length,
            mime_type: mimeType,
            uploaded_by: userId,
            status: 'uploaded',
            approval_status: 'pending',
            created_at: new Date().toISOString()
        };

        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/shipment_documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(documentData)
        });

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Database insert failed: ${errorText}`);
        }

        const savedDocument = await insertResponse.json();

        // Create notification for staff if document requires approval
        if (['customs_form', 'invoice', 'identity_document'].includes(documentType)) {
            const notificationData = {
                user_id: null, // Will be assigned to staff
                notification_type: 'document_review',
                title: 'Document Review Required',
                message: `New ${documentType} uploaded for ${shipmentId ? `shipment ${shipmentId}` : 'general review'}`,
                data: { document_id: savedDocument[0].id, shipment_id: shipmentId },
                priority: 'high'
            };

            await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });
        }

        // Send confirmation email to customer
        try {
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            if (userId && resendApiKey) {
                // Get customer email
                const profileResponse = await fetch(
                    `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}&select=email,first_name,last_name`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (profileResponse.ok) {
                    const profiles = await profileResponse.json();
                    if (profiles.length > 0 && profiles[0].email) {
                        const customerName = profiles[0].first_name && profiles[0].last_name
                            ? `${profiles[0].first_name} ${profiles[0].last_name}`
                            : 'Customer';
                        
                        const documentTypeLabel = documentType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                        
                        const emailHtml = generateNotificationEmail({
                            title: 'Document Upload Confirmed',
                            message: `Dear ${customerName}, your ${documentTypeLabel} has been successfully uploaded and is being processed.${['customs_form', 'invoice', 'identity_document'].includes(documentType) ? ' Our team will review it shortly.' : ''}`,
                            actionText: shipmentId ? 'View Shipment' : 'View Documents',
                            actionUrl: shipmentId 
                                ? `https://www.qcs-cargo.com/dashboard/shipments/${shipmentId}`
                                : 'https://www.qcs-cargo.com/dashboard',
                            details: [
                                { label: 'Document Type', value: documentTypeLabel },
                                { label: 'Document Name', value: documentName || fileName || 'Document' },
                                { label: 'Uploaded', value: new Date().toLocaleString('en-US') },
                                ...(shipmentId ? [{ label: 'Shipment ID', value: String(shipmentId) }] : [])
                            ],
                            footerNote: ['customs_form', 'invoice', 'identity_document'].includes(documentType) 
                                ? 'You will receive another email once the document has been reviewed and approved.'
                                : undefined
                        });

                        await sendEmail(resendApiKey, {
                            to: profiles[0].email,
                            subject: `Document Upload Confirmed - ${documentTypeLabel}`,
                            html: emailHtml,
                            tags: [
                                { name: 'notification_type', value: 'document_upload' },
                                { name: 'document_type', value: documentType },
                                ...(shipmentId ? [{ name: 'shipment_id', value: String(shipmentId) }] : [])
                            ]
                        });
                    }
                }
            }
        } catch (emailError) {
            console.warn('Failed to send document upload email:', emailError);
            // Don't fail document upload if email fails
        }

        const result = {
            success: true,
            document: savedDocument[0],
            message: 'Document uploaded successfully'
        };

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Document upload error:', error);

        const errorResponse = {
            error: {
                code: 'DOCUMENT_UPLOAD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});