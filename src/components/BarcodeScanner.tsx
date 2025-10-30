import React, { useState, useEffect } from 'react'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Camera, CameraOff, X } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, isOpen }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTorchOn, setIsTorchOn] = useState(false)

  useEffect(() => {
    if (isOpen) {
      requestCameraPermission()
    }
  }, [isOpen])

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setHasPermission(true)
      setError(null)
      // Stop the stream immediately, the scanner component will request it again
      stream.getTracks().forEach(track => track.stop())
    } catch (err) {
      console.error('Camera permission error:', err)
      setHasPermission(false)
      setError('Camera access denied. Please enable camera permissions in your browser settings.')
    }
  }

  const handleScan = (err: any, result: any) => {
    if (result) {
      const barcode = result.text || result
      if (barcode && typeof barcode === 'string') {
        onScan(barcode)
        onClose()
      }
    }

    if (err && err.name !== 'NotFoundException') {
      console.error('Barcode scan error:', err)
    }
  }

  const toggleTorch = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      const track = stream.getVideoTracks()[0]
      const capabilities: any = track.getCapabilities()

      if (capabilities.torch) {
        await track.applyConstraints({
          // @ts-ignore - torch is not in standard TS types yet
          advanced: [{ torch: !isTorchOn }]
        })
        setIsTorchOn(!isTorchOn)
      }
    } catch (err) {
      console.error('Torch toggle error:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <Card className="relative w-full max-w-2xl overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 z-10 bg-white/90 hover:bg-white"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Scanner header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
            <h2 className="text-xl font-bold">Scan Barcode</h2>
            <p className="text-sm text-blue-100">
              Position the barcode within the frame
            </p>
          </div>

          {/* Scanner area */}
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {hasPermission === null && (
              <div className="flex h-full items-center justify-center p-6 text-white">
                <div className="text-center">
                  <Camera className="mx-auto mb-4 h-12 w-12 animate-pulse" />
                  <p>Requesting camera access...</p>
                </div>
              </div>
            )}

            {hasPermission === false && (
              <div className="flex h-full items-center justify-center p-6 text-white">
                <div className="text-center">
                  <CameraOff className="mx-auto mb-4 h-12 w-12 text-rose-500" />
                  <p className="text-sm">{error}</p>
                  <Button
                    onClick={requestCameraPermission}
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {hasPermission === true && (
              <>
                <BarcodeScannerComponent
                  onUpdate={handleScan}
                  onError={(err: any) => {
                    if (err && err.name !== 'NotFoundException') {
                      console.error('Scanner error:', err)
                    }
                  }}
                  width="100%"
                  height="100%"
                  facingMode="environment"
                  torch={isTorchOn}
                  delay={300}
                  videoConstraints={{
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                  }}
                />

                {/* Scanning overlay with guide frame */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-64">
                    {/* Corner guides */}
                    <div className="absolute left-0 top-0 h-12 w-12 border-l-4 border-t-4 border-blue-500"></div>
                    <div className="absolute right-0 top-0 h-12 w-12 border-r-4 border-t-4 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 h-12 w-12 border-b-4 border-l-4 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 h-12 w-12 border-b-4 border-r-4 border-blue-500"></div>

                    {/* Scanning line animation */}
                    <div className="absolute inset-x-0 top-0 animate-scan">
                      <div className="h-0.5 w-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Scanner controls */}
          {hasPermission === true && (
            <div className="flex items-center justify-between bg-slate-50 p-4">
              <div className="text-sm text-slate-600">
                <p className="font-medium">Supported formats:</p>
                <p className="text-xs">
                  UPC, EAN, Code 39, Code 128, QR Code
                </p>
              </div>

              <Button
                onClick={toggleTorch}
                variant={isTorchOn ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                {isTorchOn ? 'Flash On' : 'Flash Off'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(192px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
