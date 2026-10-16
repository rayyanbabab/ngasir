"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, CameraOff, RefreshCw, ScanBarcode, Check, AlertCircle } from "lucide-react";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

// Gentle audio beep using Web Audio API (no external asset required)
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore audio error if blocked by browser policy
  }
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = "Scan Barcode / QR",
  description = "Arahkan kamera ke barcode produk atau ketik manual kode barcode",
}: BarcodeScannerDialogProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "html5-qr-reader";

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop scanner cleanly:", err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    playBeep();
    if (navigator.vibrate) {
      try { navigator.vibrate(100); } catch { /* ignore */ }
    }
    setLastScanned(decodedText);
    onScan(decodedText);
    // Auto-close dialog on successful scan
    onOpenChange(false);
  }, [onScan, onOpenChange]);

  const startScanner = useCallback(async (cameraIdToUse?: string) => {
    setErrorMsg(null);
    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const cameraConfig = cameraIdToUse
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 160 },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame scan failure (ignored)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Camera start error:", err);
      setErrorMsg(
        err instanceof Error
          ? err.message.includes("NotAllowedError")
            ? "Izin kamera ditolak. Silakan izinkan akses kamera di browser Anda."
            : err.message
          : "Gagal mengakses kamera"
      );
      setIsScanning(false);
    }
  }, [stopScanner, handleScanSuccess]);

  // Enumerate cameras when dialog opens
  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({ id: d.id, label: d.label || `Kamera ${d.id.slice(0, 5)}` }));
          setCameras(list);
          // Prefer back/environment camera
          const backCam = list.find((c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("rear") ||
            c.label.toLowerCase().includes("belakang") ||
            c.label.toLowerCase().includes("environment")
          );
          const initialId = backCam ? backCam.id : list[0].id;
          setSelectedCameraId(initialId);
          startScanner(initialId);
        } else {
          startScanner();
        }
      })
      .catch((err) => {
        console.warn("Could not enumerate cameras, falling back to facingMode:", err);
        startScanner();
      });

    return () => {
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  function handleSwitchCamera() {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startScanner(nextCamera.id);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
  }

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        stopScanner();
        setManualCode("");
        setLastScanned(null);
        setErrorMsg(null);
      }
      onOpenChange(nextOpen);
    },
    [stopScanner, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ScanBarcode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Camera Viewport */}
        <div className="relative bg-black aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
          <div id={readerElementId} className="w-full h-full" />

          {/* Scanning Reticle Overlay */}
          {isScanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-40 border-2 border-dashed border-emerald-400/70 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

                {/* Laser animation */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
            </div>
          )}

          {/* Camera controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {cameras.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-black/60 text-white hover:bg-black/80 backdrop-blur-md border border-white/20"
                onClick={handleSwitchCamera}
                title="Ganti Kamera"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-black/60 text-white hover:bg-black/80 backdrop-blur-md border border-white/20"
              onClick={() => (isScanning ? stopScanner() : startScanner(selectedCameraId))}
              title={isScanning ? "Matikan Kamera" : "Nyalakan Kamera"}
            >
              {isScanning ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </Button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="absolute inset-x-4 p-3 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 backdrop-blur-sm z-20">
              <AlertCircle className="h-4 w-4 flex-none text-rose-400" />
              <p className="flex-1">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Last scanned preview or Manual Input */}
        <div className="p-4 bg-muted/30 border-t border-border space-y-3">
          {lastScanned && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <Check className="h-4 w-4 flex-none" />
              <span>Barcode terdeteksi: <strong>{lastScanned}</strong></span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Atau ketik/scan barcode USB di sini..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="h-9 text-xs"
              autoFocus={!isScanning}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!manualCode.trim()}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Gunakan
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center">
            Mendukung barcode EAN-13, UPC, Code-128, QR Code, dan scanner USB otomatis.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
