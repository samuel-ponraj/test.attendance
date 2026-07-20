"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Maximize, QrCode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROTATION_SECONDS = 30;

const createQrImage = (teamId) => {
  const payload = JSON.stringify({
    type: "attendance-check-in",
    teamId,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + ROTATION_SECONDS * 1000,
  });

  return QRCode.toDataURL(payload, {
    width: 360,
    margin: 2,
    color: { dark: "#020617", light: "#ffffff" },
  });
};

export default function QrAttendanceModal({ open, onOpenChange, team }) {
  const [qrImage, setQrImage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS);
  const displayRef = useRef(null);

  const rotateCode = async () => {
    if (!team?.id) return;
    setQrImage(await createQrImage(team.id));
    setSecondsLeft(ROTATION_SECONDS);
  };

  useEffect(() => {
    if (!open || !team?.id) return;

    let active = true;
    const refreshQr = async () => {
      const image = await createQrImage(team.id);
      if (active) {
        setQrImage(image);
        setSecondsLeft(ROTATION_SECONDS);
      }
    };

    refreshQr();
    const qrTimer = window.setInterval(refreshQr, ROTATION_SECONDS * 1000);
    const countdownTimer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(qrTimer);
      window.clearInterval(countdownTimer);
    };
  }, [open, team?.id]);

  const openFullScreen = () => displayRef.current?.requestFullscreen?.();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={displayRef} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {team?.name} QR Attendance
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">
            Members can scan this code to check in.
          </p>

          <div className="grid min-h-[280px] min-w-[280px] place-items-center rounded-xl bg-white p-3">
            {qrImage ? (
              <Image
                src={qrImage}
                alt={`${team?.name || "Team"} attendance QR code`}
                width={360}
                height={360}
                unoptimized
                priority
              />
            ) : (
              <RefreshCw className="h-7 w-7 animate-spin text-slate-900" />
            )}
          </div>

          <p className="text-sm">
            Refreshes in <strong>{secondsLeft}s</strong>
          </p>

          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={rotateCode}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button className="flex-1" onClick={openFullScreen}>
              <Maximize className="h-4 w-4" /> Full Screen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
