"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Users,
  Globe,
  Lock,
  Plus,
  Image as ImageIcon,
  Mic,
  Settings
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Messaging() {
  const { currentUser, users, messages, chatRooms, fileTransfers, sendMessage, createChatRoom, generateInviteCode, joinRoomWithCode, sendFiles, kickMember, setRoomAdmin, transferRoomOwner, deleteChatRoom } = useApp();
  const [selectedRoom, setSelectedRoom] = useState<string>('global');
  const [messageInput, setMessageInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPublic, setNewRoomPublic] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    // Prevent non-admins from posting to global
    if (selectedRoom === 'global' && !currentUser?.isAdmin) return;

    sendMessage(messageInput, selectedRoom === 'global' ? undefined : selectedRoom);
    setMessageInput('');
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    createChatRoom(newRoomName, newRoomPublic);
    setNewRoomName('');
    setIsCreatingRoom(false);
  };

  const roomMessages = selectedRoom === 'global' 
    ? messages.filter(m => !m.roomId)
    : messages.filter(m => m.roomId === selectedRoom);

  const currentRoom = selectedRoom === 'global' ? null : chatRooms.find(r => r.id === selectedRoom) || null;
  const isRoomOwner = currentRoom ? currentRoom.createdBy === currentUser?.id : false;
  const isRoomAdmin = currentRoom ? (isRoomOwner || (currentRoom.admins || []).includes(currentUser?.id || '')) : false;

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure context (HTTP)
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  };

  const handleImagePick = () => fileInputRef.current?.click();
  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await sendFiles(files, selectedRoom === 'global' ? undefined : selectedRoom);
    e.target.value = '';
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await sendFiles([file], selectedRoom === 'global' ? undefined : selectedRoom);
        // stop tracks
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      mr.start();
    } catch (e) {
      console.warn('Audio recording error', e);
    }
  };

  const userRooms = chatRooms.filter(room => 
    room.isPublic || room.participants.includes(currentUser?.id || '')
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Rooms Sidebar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Chat Rooms</CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={isCreatingRoom} onOpenChange={setIsCreatingRoom}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" aria-label="Create chat room" title="Create chat room">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Chat Room</DialogTitle>
                  <DialogDescription>
                    Create a new room for group conversations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="room-name">Room Name</Label>
                    <Input
                      id="room-name"
                      placeholder="Enter room name"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="room-public">Public Room</Label>
                    <Switch
                      id="room-public"
                      checked={newRoomPublic}
                      onCheckedChange={setNewRoomPublic}
                    />
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full">
                    Create Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isJoiningRoom} onOpenChange={setIsJoiningRoom}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" aria-label="Join room via code" title="Join room via code">
                  Join
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Room</DialogTitle>
                  <DialogDescription>Paste the invitation code to join a private room</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="join-code">Invitation Code</Label>
                    <Input id="join-code" placeholder="Paste code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={() => { if (joinRoomWithCode(joinCode)) { setJoinCode(''); setIsJoiningRoom(false); } }}>
                    Join Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant={selectedRoom === 'global' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedRoom('global')}
            >
              <Globe className="w-4 h-4 mr-2" />
              Global Chat
              <Badge variant="secondary" className="ml-auto">
                {messages.filter(m => !m.roomId).length}
              </Badge>
            </Button>

            {userRooms.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Rooms
                  </p>
                </div>
                {userRooms.map((room) => (
                  <Button
                    key={room.id}
                    variant={selectedRoom === room.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedRoom(room.id)}
                  >
                    {room.isPublic ? (
                      <Users className="w-4 h-4 mr-2" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    {room.name}
                    <Badge variant="secondary" className="ml-auto">
                      {messages.filter(m => m.roomId === room.id).length}
                    </Badge>
                  </Button>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex min-h-[400px] h-[70vh] flex-col overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {selectedRoom === 'global' ? 'Global Chat' : userRooms.find(r => r.id === selectedRoom)?.name}
            </CardTitle>
            {/* Invite & Settings */}
            <div className="flex items-center gap-2">
              {selectedRoom !== 'global' && (() => {
                const room = chatRooms.find(r => r.id === selectedRoom);
                if (!room || room.isPublic) return null;
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const code = generateInviteCode(room.id);
                      if (code) { setInviteCode(code); setIsInviteOpen(true); }
                    }}
                  >
                    Invite
                  </Button>
                );
              })()}
              {selectedRoom !== 'global' && isRoomAdmin && (
                <Button size="sm" variant="ghost" onClick={() => setIsSettingsOpen(true)} title="Room settings">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            {selectedRoom === 'global' 
              ? (currentUser?.isAdmin ? 'Broadcast messages to all users on the network' : 'Read-only global announcements')
              : 'Room conversation'}
          </CardDescription>
          {/* Invite dialog */}
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Invitation</DialogTitle>
                <DialogDescription>Share this code with someone to join the room</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input value={inviteCode} readOnly />
                <div className="flex items-center gap-2">
                  <Button onClick={() => copyToClipboard(inviteCode)} variant="secondary">{copied ? 'Copied!' : 'Copy Code'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4 pb-4">
              {roomMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-2">Start the conversation!</p>
                </div>
              ) : (
                roomMessages.map((message) => {
                  const isCurrentUser = message.senderId === currentUser?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {!isCurrentUser && (
                          <p className="text-xs font-semibold mb-1 opacity-70">
                            {message.senderName}
                          </p>
                        )}
                        <div className="text-sm break-words">
                          {(() => {
                            try {
                              const meta = JSON.parse(message.content);
                              if (meta && meta.transferId && meta.fileName) {
                                const ft = fileTransfers.find(t => t.id === meta.transferId);
                                const url = ft?.downloadUrl;
                                if ((meta.mime || '').startsWith('image/') && url) {
                                  return (
                                    <div className="space-y-1">
                                      <img src={url} alt={meta.fileName} className="rounded max-h-64 object-contain" />
                                      <a href={url} download className="underline">{meta.fileName}</a>
                                    </div>
                                  );
                                }
                                if ((meta.mime || '').startsWith('audio/') && url) {
                                  return (
                                    <div className="space-y-1">
                                      <audio controls src={url} className="w-full" />
                                      <a href={url} download className="underline">{meta.fileName}</a>
                                    </div>
                                  );
                                }
                                // Fallback display while downloading or unknown mime
                                return <span>File: {meta.fileName}{!url ? ' (downloading...)' : ''}</span>;
                              }
                            } catch {}
                            return <span>{message.content}</span>;
                          })()}
                        </div>
                        <p className={`text-xs mt-1 ${
                          isCurrentUser ? 'opacity-70' : 'text-muted-foreground'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t items-center">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFilesSelected} />
            <Button type="button" variant="ghost" size="icon" onClick={handleImagePick} title="Send image">
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button type="button" variant={isRecording ? 'default' : 'ghost'} size="icon" onClick={toggleRecording} title={isRecording ? 'Stop recording' : 'Record voice note'}>
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
            <Input
              placeholder={selectedRoom === 'global' && !currentUser?.isAdmin ? 'Global chat is read-only' : 'Type a message...'}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1"
              disabled={selectedRoom === 'global' && !currentUser?.isAdmin}
              title={selectedRoom === 'global' && !currentUser?.isAdmin ? 'Only admins can post in Global' : undefined}
            />
            <Button type="submit" size="icon" aria-label="Send message" title="Send message" disabled={selectedRoom === 'global' && !currentUser?.isAdmin}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
          {/* Room Settings Dialog */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Room Settings</DialogTitle>
                <DialogDescription>Manage participants and permissions</DialogDescription>
              </DialogHeader>
              {currentRoom && (
                <div className="space-y-4 pt-2">
                  <div>
                    <p className="text-sm font-medium mb-2">Participants</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {currentRoom.participants.map(uid => {
                        const u = users.find(x => x.id === uid);
                        const isOwnerRow = uid === currentRoom.createdBy;
                        const isAdminRow = (currentRoom.admins || []).includes(uid);
                        return (
                          <div key={uid} className="flex items-center gap-2 justify-between border rounded p-2">
                            <div>
                              <p className="text-sm font-medium">{u?.displayName || uid}</p>
                              <p className="text-xs text-muted-foreground">{isOwnerRow ? 'Owner' : isAdminRow ? 'Admin' : 'Member'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRoomAdmin && !isOwnerRow && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => kickMember(currentRoom.id, uid)}>Kick</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setRoomAdmin(currentRoom.id, uid, !isAdminRow)}>
                                    {isAdminRow ? 'Remove admin' : 'Make admin'}
                                  </Button>
                                </>
                              )}
                              {isRoomOwner && !isOwnerRow && (
                                <Button size="sm" variant="secondary" onClick={() => transferRoomOwner(currentRoom.id, uid)}>Make owner</Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {isRoomOwner && (
                    <div className="pt-2">
                      <Button variant="destructive" onClick={() => { deleteChatRoom(currentRoom.id); setIsSettingsOpen(false); setSelectedRoom('global'); }}>Delete Room</Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
      </Card>
    </div>
  );
}
