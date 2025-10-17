"use client";

import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  HardDrive,
  Activity,
  Clock,
  Wifi,
  User
} from 'lucide-react';
import { Device } from '@/types';

export default function DeviceMonitor() {
  const { devices, activityLogs, users } = useApp();

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <HardDrive className="w-5 h-5" />;
    }
  };

  const getUser = (userId?: string) => {
    return users.find(u => u.id === userId);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Connected Devices
          </CardTitle>
          <CardDescription>
            Devices discovered on the local network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No devices detected</p>
              <p className="text-sm mt-2">Devices will appear automatically when detected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => {
                const user = getUser(device.userId);
                return (
                  <div key={device.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          device.isOnline 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {getDeviceIcon(device.type)}
                        </div>
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {device.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant={device.isOnline ? 'default' : 'secondary'}>
                        {device.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wifi className="w-4 h-4" />
                        <span className="font-mono">{device.ipAddress}</span>
                      </div>
                      {user && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{user.displayName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          Last seen: {new Date(device.lastSeen).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Network Activity
          </CardTitle>
          <CardDescription>
            Complete log of all network events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm mt-2">Network events will be logged here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {activityLogs.slice().reverse().map((log) => (
                <div key={log.id} className="border-l-2 border-primary/20 pl-4 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{log.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {log.type.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Statistics */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Network Statistics</CardTitle>
          <CardDescription>Overview of network usage and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{devices.length}</p>
                  <p className="text-sm text-muted-foreground">Total Devices</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {devices.filter(d => d.isOnline).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Now</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.status === 'online').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Online Users</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activityLogs.length}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}