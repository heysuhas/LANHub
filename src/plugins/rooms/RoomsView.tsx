"use client";

import React, { useState } from 'react';
import { useCoreState, coreStore } from '@/core/state';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Lock, Plus, Users, FolderPlus, ArrowRight, Share2, KeyRound, Check, UserPlus, Laptop } from 'lucide-react';
import { toast } from 'sonner';

export function RoomsView() {
  const { rooms, users, currentUser } = useCoreState();
  const { createChatRoom, generateInviteCode, joinRoomWithCode, sendMessage } = useApp();

  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const [selectedRoomForInvite, setSelectedRoomForInvite] = useState<any | null>(null);
  const [isInvitePeerOpen, setIsInvitePeerOpen] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !currentUser) return;

    await createChatRoom(roomName.trim(), isPublic);
    setRoomName('');
    toast.success(`Room "${roomName}" created`);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    const success = joinRoomWithCode(joinCodeInput.trim());
    if (success) {
      toast.success('Joined room successfully!');
      setJoinCodeInput('');
      setIsJoinDialogOpen(false);
      coreStore.setState({ activePluginId: 'chat' });
    } else {
      toast.error('Invalid or expired room invite code');
    }
  };

  const handleOpenInvitePeerModal = (room: any) => {
    setSelectedRoomForInvite(room);
    setIsInvitePeerOpen(true);
  };

  const handleDirectInvitePeer = async (targetUser: any) => {
    if (!selectedRoomForInvite || !currentUser) return;
    const roomId = selectedRoomForInvite.id;
    const code = generateInviteCode(roomId);

    try {
      // Send backend room update to add participant
      await fetch('/api/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_room',
          payload: { roomId, byUserId: currentUser.id, addParticipant: targetUser.id }
        })
      });

      // DM an in-app invite code message to the target peer
      if (code) {
        sendMessage(`🔑 Private Room Invite for #${selectedRoomForInvite.name}: Code is [${code}]`, undefined);
      }

      toast.success(`Invited ${targetUser.displayName} to #${selectedRoomForInvite.name}!`);
      setIsInvitePeerOpen(false);
    } catch (err) {
      toast.error('Failed to send in-app invite');
    }
  };

  const handleEnterRoom = (room: any) => {
    if (!currentUser) return;

    const isParticipant = room.isPublic || room.createdBy === currentUser.id || (room.participants && room.participants.includes(currentUser.id));
    if (!isParticipant) {
      setIsJoinDialogOpen(true);
      toast.error('Private Room: Please enter invite code or accept an invite to join.');
      return;
    }

    coreStore.setState({ activePluginId: 'chat' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collaboration Rooms</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create or join public & private rooms across your local network
          </p>
        </div>

        {/* Join Private Room Dialog */}
        <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Enter Invite Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Private Room</DialogTitle>
              <DialogDescription>
                Enter the invite code shared by the room owner or sent in chat
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleJoinByCode} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="join-code">Invite Code</Label>
                <Input
                  id="join-code"
                  placeholder="Paste room invite code..."
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!joinCodeInput.trim()}>
                Join Room
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Room Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create Room
            </CardTitle>
            <CardDescription>Start a new public or private collaboration room</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  placeholder="e.g. Hackathon Team, Lab 4"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-y">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Public Room</Label>
                  <p className="text-xs text-muted-foreground">Discoverable by all LAN peers</p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <Button type="submit" className="w-full" disabled={!roomName.trim()}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Rooms Grid */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Active LAN Rooms ({rooms.length})
            </CardTitle>
            <CardDescription>Join ongoing collaboration spaces on your subnet</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room) => {
              const isJoined = room.isPublic || room.createdBy === currentUser?.id || (room.participants && room.participants.includes(currentUser?.id || ''));
              return (
                <div key={room.id} className="p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        {room.isPublic ? <Globe className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-amber-500" />}
                        <span className="truncate">{room.name}</span>
                      </div>
                      <Badge variant={room.isPublic ? 'secondary' : 'outline'}>
                        {room.isPublic ? 'Public' : isJoined ? 'Joined' : 'Private'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Created {new Date(room.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    {!room.isPublic && isJoined && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInvitePeerModal(room)}
                        title="Invite Registered LAN Peer"
                        className="text-xs gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Invite Peer
                      </Button>
                    )}
                    <Button
                      variant={isJoined ? 'default' : 'secondary'}
                      size="sm"
                      className="flex-1 justify-between text-xs"
                      onClick={() => handleEnterRoom(room)}
                    >
                      <span>{isJoined ? 'Enter Room' : 'Request Access'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Direct Peer Invite Modal */}
      <Dialog open={isInvitePeerOpen} onOpenChange={setIsInvitePeerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite LAN Peer to #{selectedRoomForInvite?.name}</DialogTitle>
            <DialogDescription>
              Select a discovered online device or peer on your subnet to send an in-app invite directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
            {users.filter(u => u.id !== currentUser?.id).length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No other LAN peers online right now.</p>
            ) : (
              users.filter(u => u.id !== currentUser?.id).map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 border rounded-lg bg-card">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-sm font-medium">{u.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleDirectInvitePeer(u)}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Invite
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
