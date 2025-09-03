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
        // Extract document data from request body
        const requestData = await req.json();
        const {
            shipment_id,
            document_type,
            document_name,
            file_data, // base64 encoded file data
            file_extension,
            requires_signature
        } = requestData;

        // Validate required fields
        if (!shipment_id || !document_type || !document_name || !file_data || !file_extension) {
            throw new Error('Missing required fields: shipment_id, document_type, document_name, file_data, file_extension');
        }

        // Get Supabase configuration
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header provided');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token and get user
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

        // Verify the shipment belongs to the authenticated user
        const shipmentCheckResponse = await fetch(`${supabaseUrl}/rest/v1/shipments?id=eq.${shipment_id}&customer_id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!shipmentCheckResponse.ok) {
            throw new Error('Failed to verify shipment ownership');
        }

        const shipmentData = await shipmentCheckResponse.json();
        if (!shipmentData || shipmentData.length === 0) {
            throw new Error('Shipment not found or access denied');
        }

        // Extract base64 data and determine MIME type
        let base64Data = file_data;
        let mimeType = 'application/octet-stream';
        
        if (file_data.includes(',')) {
            // Data URL format (data:mime;base64,data)
            const parts = file_data.split(',');
            base64Data = parts[1];
            const mimeMatch = parts[0].match(/data:([^;]+)/);
            if (mimeMatch) {
                mimeType = mimeMatch[1];
            }
        } else {
            // Determine MIME type from file extension
            const mimeTypes = {
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'txt': 'text/plain'
            };
            mimeType = mimeTypes[file_extension.toLowerCase()] || 'application/octet-stream';
        }

        // Convert base64 to binary
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${shipment_id}_${document_type}_${timestamp}.${file_extension}`;
        const filePath = `documents/${fileName}`;

        // Upload file to Supabase Storage
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
            throw new Error(`File upload failed: ${errorText}`);
        }

        // Get the public URL for the uploaded file
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/shipment-documents/${filePath}`;

        // Save document metadata to database
        const documentData = {
            shipment_id,
            document_type,
            document_name,
            file_url: publicUrl,
            file_path: filePath,
            file_size: binaryData.length,
            mime_type: mimeType,
            uploaded_by: userId,
            requires_signature: requires_signature || false,
            status: requires_signature ? 'pending_signature' : 'uploaded',
            upload_date: new Date().toISOString()
        };

        const documentResponse = await fetch(`${supabaseUrl}/rest/v1/shipment_documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(documentData)
        });

        if (!documentResponse.ok) {
            const errorText = await documentResponse.text();
            throw new Error(`Failed to save document metadata: ${errorText}`);
        }

        const documentResult = await documentResponse.json();
        const document = documentResult[0];

        // Create a notification for staff about new document upload
        const notificationData = {
            recipient_type: 'staff',
            title: 'New Document Uploaded',
            message: `Customer uploaded ${document_type} for shipment ${shipment_id}`,
            reference_type: 'shipment',
            reference_id: shipment_id,
            priority: 'normal',
            created_at: new Date().toISOString()
        };

        const notificationResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });

        if (!notificationResponse.ok) {
            console.error('Failed to create notification for staff');
        }

        // Return success response
        const result = {
            success: true,
            document: {
                id: document.id,
                document_type: document.document_type,
                document_name: document.document_name,
                file_url: publicUrl,
                status: document.status,
                upload_date: document.upload_date,
                file_size: document.file_size,
                requires_signature: document.requires_signature
            },
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