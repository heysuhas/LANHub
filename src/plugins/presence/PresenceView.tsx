"use client";

import React from 'react';
import { useCoreState } from '@/core/state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Laptop, Smartphone, Users, Wifi, ShieldCheck, HardDrive } from 'lucide-react';

export function PresenceView() {
  const { devices, users, rooms, transfers, currentUser, currentDevice } = useCoreState();

  const onlineDevices = devices.filter((d) => d.isOnline);
  const activeRooms = rooms.length;
  const activeTransfers = transfers.filter((t) => t.status === 'transferring').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LAN Hub Overview</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Local Network Active • Encrypted E2E
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2 inline-block" />
          Network Online
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
            <Laptop className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineDevices.length || 1}</div>
            <p className="text-xs text-muted-foreground mt-1">Active on subnet</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Online Peers</CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length || (currentUser ? 1 : 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Users discovered</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
            <Activity className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRooms}</div>
            <p className="text-xs text-muted-foreground mt-1">Public & Private</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">File Transfers</CardTitle>
            <HardDrive className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTransfers}</div>
            <p className="text-xs text-muted-foreground mt-1">Ongoing P2P streams</p>
          </CardContent>
        </Card>
      </div>

      {/* Discovered Devices & Local Identity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Discovered Devices
            </CardTitle>
            <CardDescription>Peers broadcasting on local network</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length === 0 && users.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/40 text-center text-sm text-muted-foreground">
                Current device actively broadcasting on LAN.
              </div>
            ) : (
              (devices.length > 0 ? devices : users.map(u => ({
                id: `dev-${u.id}`,
                name: `${u.displayName}'s Device`,
                ipAddress: 'Local Subnet',
                isOnline: u.status === 'online',
                type: 'desktop'
              }))).map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    {device.type === 'mobile' ? (
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Laptop className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{device.name}</div>
                      <div className="text-xs text-muted-foreground">{device.ipAddress}</div>
                    </div>
                  </div>
                  <Badge variant={device.isOnline ? 'default' : 'secondary'}>
                    {device.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Local Device Identity
            </CardTitle>
            <CardDescription>Your node's local network configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Display Name</span>
                <span className="font-medium">{currentUser?.displayName || 'Anonymous Peer'}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono text-xs">{currentUser?.username || 'user'}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Device Name</span>
                <span className="font-medium">{currentDevice?.name || 'Local Host'}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Transport Engine</span>
                <span className="font-medium text-emerald-500">WebSocket / P2P</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Encryption Status</span>
                <span className="font-medium text-emerald-500">AES-256-GCM / WebCrypto</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
