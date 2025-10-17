"use client";

import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wifi, 
  Users, 
  MessageSquare, 
  Files, 
  Monitor, 
  LogOut,
  Activity,
  Send,
  Download,
  Upload,
  Radio,
  Shield,
  Home,
  Settings
} from 'lucide-react';
import FileSharing from './FileSharing';
import Messaging from './Messaging';
import DeviceMonitor from './DeviceMonitor';

export default function Dashboard() {
  const { currentUser, users, devices, fileTransfers, activityLogs, logout, simulateDeviceDiscovery } = useApp();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    simulateDeviceDiscovery();
  }, [simulateDeviceDiscovery]);

  const onlineUsers = users.filter(u => u.status === 'online');
  const recentTransfers = fileTransfers.slice(-5).reverse();
  const recentLogs = activityLogs.slice(-5).reverse();

  return (
    <div className="min-h-screen">
      {/* Header with Navigation */}
      <header className="border-b border-white/10 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">LAN Hub</h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse text-green-500" />
                    Local Network Active • {onlineUsers.length} Online
                  </p>
                </div>
              </div>

              {/* Navigation Buttons */}
              <nav className="hidden md:flex items-center gap-2">
                <Button 
                  variant={activeTab === 'overview' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveTab('overview')}
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Overview
                </Button>
                <Button 
                  variant={activeTab === 'files' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveTab('files')}
                  className="gap-2"
                >
                  <Files className="w-4 h-4" />
                  Files
                </Button>
                <Button 
                  variant={activeTab === 'messages' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveTab('messages')}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </Button>
                <Button 
                  variant={activeTab === 'devices' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setActiveTab('devices')}
                  className="gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  Devices
                </Button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-medium">{currentUser?.displayName}</p>
                <div className="flex items-center gap-2 justify-end">
                  {currentUser?.isAdmin && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  <Badge variant="default" className="text-xs">
                    <Activity className="w-3 h-3 mr-1" />
                    Online
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden mt-4 flex gap-2 overflow-x-auto pb-2">
            <Button 
              variant={activeTab === 'overview' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('overview')}
              className="gap-2 whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              Overview
            </Button>
            <Button 
              variant={activeTab === 'files' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('files')}
              className="gap-2 whitespace-nowrap"
            >
              <Files className="w-4 h-4" />
              Files
            </Button>
            <Button 
              variant={activeTab === 'messages' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('messages')}
              className="gap-2 whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              Messages
            </Button>
            <Button 
              variant={activeTab === 'devices' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('devices')}
              className="gap-2 whitespace-nowrap"
            >
              <Monitor className="w-4 h-4" />
              Devices
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className={activeTab !== 'overview' ? 'hidden' : ''}>
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Online Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{onlineUsers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {onlineUsers.length === 1 ? 'user' : 'users'} on network
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{devices.filter(d => d.isOnline).length}</div>
                  <p className="text-xs text-muted-foreground">
                    {devices.length} total devices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">File Transfers</CardTitle>
                  <Files className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fileTransfers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {fileTransfers.filter(f => f.status === 'completed').length} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Network Status</CardTitle>
                  <Activity className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">Active</div>
                  <p className="text-xs text-muted-foreground">LAN connection stable</p>
                </CardContent>
              </Card>
            </div>

            {/* Online Users & Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Online Users</CardTitle>
                  <CardDescription>Users currently on the network</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {onlineUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No users online</p>
                    ) : (
                      onlineUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {user.displayName[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.displayName}</p>
                              <p className="text-xs text-muted-foreground">@{user.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {user.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest network events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    ) : (
                      recentLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {log.type === 'file_sent' && <Upload className="w-4 h-4" />}
                            {log.type === 'file_received' && <Download className="w-4 h-4" />}
                            {log.type === 'message' && <MessageSquare className="w-4 h-4" />}
                            {log.type === 'login' && <Activity className="w-4 h-4 text-green-500" />}
                            {log.type === 'logout' && <Activity className="w-4 h-4 text-gray-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{log.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks for LAN collaboration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button onClick={() => setActiveTab('files')} className="gap-2">
                    <Send className="w-4 h-4" />
                    Share Files
                  </Button>
                  <Button onClick={() => setActiveTab('messages')} variant="outline" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </Button>
                  <Button onClick={() => setActiveTab('devices')} variant="outline" className="gap-2">
                    <Monitor className="w-4 h-4" />
                    View Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className={activeTab !== 'files' ? 'hidden' : ''}>
          <FileSharing />
        </div>

        <div className={activeTab !== 'messages' ? 'hidden' : ''}>
          <Messaging />
        </div>

        <div className={activeTab !== 'devices' ? 'hidden' : ''}>
          <DeviceMonitor />
        </div>
      </main>
    </div>
  );
}