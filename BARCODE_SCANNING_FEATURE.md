# Barcode Scanning Feature

## Overview

Implemented camera-based barcode scanning for the Package Receiving system, enabling admins to scan package tracking numbers using mobile device cameras or dedicated scanning equipment.

## Features

### 📱 Multi-Device Support

**Mobile Devices:**
- Camera button opens full-screen barcode scanner
- Uses device's rear camera (environment facing)
- Real-time barcode detection
- Automatic capture when barcode is detected

**Desktop/Tablet:**
- Camera scanner via webcam
- Manual keyboard entry support
- USB barcode scanner hardware support

**Dedicated Scanners:**
- External USB/Bluetooth barcode scanners work directly with input field
- No additional configuration needed
- Keyboard wedge mode supported

### 📷 Scanner Features

1. **Camera Access**
   - Automatic permission request
   - Clear error messaging if permission denied
   - Retry option for failed permissions

2. **Visual Guidance**
   - Animated scanning frame with corner guides
   - Scanning line animation for visual feedback
   - Clear instructions and positioning guidance

3. **Barcode Format Support**
   - UPC (Universal Product Code)
   - EAN (European Article Number)
   - Code 39
   - Code 128
   - QR Codes
   - And more...

4. **Flash/Torch Control**
   - Toggle flash on/off for low-light conditions
   - Available on supported devices
   - Visual indicator when flash is active

5. **Responsive Design**
   - Full-screen scanner on mobile
   - Modal overlay on desktop
   - Touch-friendly controls
   - Keyboard accessible

## User Interface

### Package Receiving Workflow

1. **Enter Mailbox Number**
   - Type or scan mailbox identifier
   - System verifies and shows customer info

2. **Scan Tracking Numbers**
   - **Option A: Camera Button** - Opens camera scanner
   - **Option B: Type/Scan** - Direct input field for keyboard entry or hardware scanners
   - **Option C: Hardware Scanner** - USB/Bluetooth scanner inputs directly

3. **Add Notes (Optional)**
   - Add package-specific notes
   - Notes appear in customer notification

4. **Submit Batch**
   - Records all packages at once
   - Sends consolidated notification to customer

### Scanner UI Elements

**Input Section:**
```
┌─────────────────────────────────────────────┐
│ Scan Tracking Number                        │
├─────────────────────────────────────────────┤
│ [Type or scan barcode and press Enter] [📷]│
│ Use camera scanner for mobile devices, or   │
│ connect a barcode scanner                   │
└─────────────────────────────────────────────┘
```

**Camera Scanner Modal:**
```
┌───────────────────────────────────────────┐
│ Scan Barcode                          [✕] │
│ Position the barcode within the frame     │
├───────────────────────────────────────────┤
│                                           │
│         ┏━━━━━━━━━━━━━━━┓                │
│         ┃   [CAMERA]    ┃                │
│         ┃   ─────────   ┃  ← Scan line   │
│         ┃               ┃                │
│         ┗━━━━━━━━━━━━━━━┛                │
│                                           │
├───────────────────────────────────────────┤
│ Supported formats:        [Flash Off]     │
│ UPC, EAN, Code 39, Code 128, QR Code     │
└───────────────────────────────────────────┘
```

## Technical Implementation

### Components

**1. BarcodeScanner Component**
- Location: `src/components/BarcodeScanner.tsx`
- Library: `react-qr-barcode-scanner`
- Props:
  - `isOpen: boolean` - Controls modal visibility
  - `onScan: (barcode: string) => void` - Callback with scanned barcode
  - `onClose: () => void` - Close handler

**2. AdminPackageReceiving Integration**
- Location: `src/pages/admin/AdminPackageReceiving.tsx`
- Added camera button next to tracking input
- Integrated BarcodeScanner component
- Handles duplicate detection
- Auto-adds scanned barcodes to batch

### Key Functions

**`handleCameraScan(barcode: string)`**
- Processes barcode from camera scanner
- Validates and normalizes tracking number
- Checks for duplicates
- Adds to package batch
- Shows success toast notification

**`attemptAddTracking()`**
- Handles manual/hardware scanner input
- Same validation as camera scan
- Preserves existing functionality

### Scanner Configuration

```typescript
<BarcodeScannerComponent
  onUpdate={handleScan}
  width="100%"
  height="100%"
  facingMode="environment"  // Rear camera
  torch={isTorchOn}
  delay={300}  // 300ms between scans
  videoConstraints={{
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  }}
/>
```

## Usage Instructions

### For Admins (Mobile)

1. Navigate to Package Receiving page
2. Enter customer's mailbox number
3. Click the **Camera** button (📷)
4. Allow camera permissions if prompted
5. Point camera at barcode
6. Hold steady until barcode is detected
7. Scanner auto-closes and adds tracking number
8. Repeat for additional packages
9. Submit batch when done

### For Admins (Desktop with Scanner)

1. Navigate to Package Receiving page
2. Enter customer's mailbox number
3. Click into tracking number input field
4. Use hardware scanner to scan barcode
5. Press Enter to add to batch
6. Repeat for additional packages
7. Submit batch when done

### For Admins (Desktop with Webcam)

1. Navigate to Package Receiving page
2. Enter customer's mailbox number
3. Click the **Camera** button
4. Allow webcam permissions if prompted
5. Hold barcode up to webcam
6. Wait for automatic detection
7. Scanner auto-closes and adds tracking number
8. Repeat for additional packages
9. Submit batch when done

## Browser Compatibility

### Camera Scanner Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ | ✅ | Full support |
| Safari | ✅ | ✅ | iOS 11+ required |
| Firefox | ✅ | ✅ | Full support |
| Edge | ✅ | ✅ | Chromium-based |
| Opera | ✅ | ✅ | Full support |

### Required Permissions

- **Camera Access**: Required for camera scanning
- **HTTPS**: Required for camera API (production)
- **localhost**: Works without HTTPS (development)

## Troubleshooting

### Camera Not Working

**Issue:** "Camera access denied"
**Solution:**
1. Check browser permissions
2. Allow camera access when prompted
3. Try refreshing the page
4. Check if another app is using the camera

**Issue:** "Camera not found"
**Solution:**
1. Verify device has a camera
2. Check if camera is enabled in system settings
3. Try using different browser
4. Restart device

### Barcode Not Scanning

**Issue:** Barcode not detected
**Solution:**
1. Ensure good lighting
2. Hold barcode steady
3. Try enabling flash/torch
4. Make sure barcode is in focus
5. Try different angle or distance
6. Verify barcode format is supported

### Performance Issues

**Issue:** Scanner is slow or laggy
**Solution:**
1. Close other camera-using apps
2. Reduce browser tabs
3. Try lower lighting conditions (easier to process)
4. Use hardware scanner as alternative

## Hardware Scanner Setup

### USB Barcode Scanners

Most USB barcode scanners work in "keyboard wedge" mode:

1. **Connect Scanner**
   - Plug USB scanner into device
   - No drivers needed (usually)
   - Scanner acts like a keyboard

2. **Configure (if needed)**
   - Some scanners need configuration barcode
   - Set to "Enter key suffix" mode
   - This auto-submits after scan

3. **Use**
   - Click into tracking input field
   - Scan barcode with hardware scanner
   - Tracking number appears and auto-adds

### Bluetooth Scanners

1. Pair scanner with device via Bluetooth
2. Scanner will act as keyboard input
3. Follow same steps as USB scanner

## Dependencies

```json
{
  "react-qr-barcode-scanner": "^2.1.16"
}
```

## Future Enhancements

1. **Batch Scanning Mode**
   - Continuous scanning without closing modal
   - Queue multiple barcodes rapidly
   - Show count during scanning

2. **Scanner History**
   - Recently scanned codes
   - Quick re-add from history
   - Duplicate detection from history

3. **Advanced Settings**
   - Adjustable scan delay
   - Barcode format filtering
   - Sound feedback options

4. **Offline Support**
   - Cache scans offline
   - Sync when connection restored
   - Offline mode indicator

5. **Multi-Camera Support**
   - Switch between front/rear cameras
   - Select specific camera on multi-camera devices

## Security Considerations

- Camera access requires user permission
- HTTPS required in production
- No image data stored or transmitted
- Only barcode data captured and processed
- Camera released immediately after scan

## Accessibility

- Keyboard navigation supported
- Screen reader compatible
- Clear visual feedback
- High contrast UI elements
- Large touch targets for mobile

## Related Files

- `src/components/BarcodeScanner.tsx` - Scanner component
- `src/pages/admin/AdminPackageReceiving.tsx` - Package receiving page
- `supabase/functions/admin-receive-package/index.ts` - Backend handler
- `package.json` - Dependencies

## Testing Checklist

- [ ] Camera permission request works
- [ ] Barcode scanning detects codes
- [ ] Flash/torch toggle works (mobile)
- [ ] Scanner closes on successful scan
- [ ] Duplicate detection works
- [ ] Manual input still works
- [ ] Hardware scanner works
- [ ] Error messages display correctly
- [ ] Works on mobile devices
- [ ] Works on desktop browsers
- [ ] Responsive design scales properly
- [ ] Accessibility features work
