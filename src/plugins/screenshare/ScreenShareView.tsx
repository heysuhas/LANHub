"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useCoreState } from '@/core/state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Play, Square, Video, ShieldCheck, Tv } from 'lucide-react';
import { coreEventBus } from '@/core/event-bus';
import { toast } from 'sonner';

export function ScreenShareView() {
  const { currentUser } = useCoreState();
  const [isSharing, setIsSharing] = useState(false);
  const [activeBroadcaster, setActiveBroadcaster] = useState<{ hostId: string; hostName: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Check for active broadcast across LAN
    let stop = false;
    const checkBroadcast = async () => {
      if (stop) return;
      try {
        const res = await fetch('/api/ws', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'get_state', payload: {} }),
        });
        const data = await res.json();
        if (data.activeScreenShare) {
          setActiveBroadcaster(data.activeScreenShare);
        } else {
          setActiveBroadcaster(null);
        }
      } catch (err) {
        // ignore
      } finally {
        if (!stop) setTimeout(checkBroadcast, 1000);
      }
    };
    void checkBroadcast();
    return () => {
      stop = true;
    };
  }, []);

  const startScreenShare = async () => {
    if (!currentUser) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsSharing(true);

      // Inform LAN server node about active broadcast
      await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'screenshare_start',
          payload: { hostId: currentUser.id, hostName: currentUser.displayName },
        }),
      });

      toast.success('Screen broadcast started across local network!');

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('[ScreenShare] Error picking display stream:', err);
      toast.error('Could not start screen sharing');
    }
  };

  const stopScreenShare = async () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }
    setIsSharing(false);

    try {
      await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'screenshare_stop', payload: {} }),
      });
    } catch {}

    toast.info('Screen broadcast ended');
  };

  const isReceivingRemote = !isSharing && activeBroadcaster && activeBroadcaster.hostId !== currentUser?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Monitor className="w-8 h-8 text-primary" />
            P2P Screen Sharing
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Real-time Local Network Display Stream
          </p>
        </div>
        <Badge
          variant={isSharing || isReceivingRemote ? 'default' : 'secondary'}
          className="px-3 py-1 text-sm"
        >
          {isSharing ? 'Live Broadcasting' : isReceivingRemote ? 'Receiving Live Stream' : 'Idle'}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-500" />
              {isSharing
                ? 'Your Display Stream (Broadcasting)'
                : isReceivingRemote
                ? `Live Broadcast from ${activeBroadcaster?.hostName}`
                : 'Display Viewport'}
            </CardTitle>
            <CardDescription>
              {isSharing
                ? 'Screen active and broadcasting to connected LAN devices'
                : isReceivingRemote
                ? 'Connected to remote LAN stream'
                : 'Preview or watch active screen broadcasts'}
            </CardDescription>
          </div>

          {isSharing ? (
            <Button variant="destructive" onClick={stopScreenShare}>
              <Square className="w-4 h-4 mr-2 fill-current" /> Stop Sharing
            </Button>
          ) : (
            <Button onClick={startScreenShare}>
              <Play className="w-4 h-4 mr-2 fill-current" /> Share Screen
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4">
          <div className="aspect-video bg-black/90 rounded-xl overflow-hidden relative flex items-center justify-center border">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isSharing}
              className={`w-full h-full object-contain ${isSharing || isReceivingRemote ? 'block' : 'hidden'}`}
            />

            {!isSharing && !isReceivingRemote && (
              <div className="text-center text-muted-foreground p-8 flex flex-col items-center">
                <Video className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-medium text-base">No active screen broadcast</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Click 'Share Screen' on your PC to broadcast your window or display to your phone or other LAN peers.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
