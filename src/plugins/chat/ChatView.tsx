"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useCoreState } from '@/core/state';
import { coreTransport } from '@/core/transport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Users, Globe, Lock, ShieldCheck } from 'lucide-react';
import { Message } from '@/types';

import { useApp } from '@/contexts/AppContext';

export function ChatView() {
  const { currentUser, rooms, messages } = useCoreState();
  const { sendMessage } = useApp();
  const [selectedRoomId, setSelectedRoomId] = useState<string>('general');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  const currentRoomMessages = messages.filter((m) =>
    selectedRoomId === 'general' ? !m.roomId || m.roomId === 'general' : m.roomId === selectedRoomId
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedRoomId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    sendMessage(inputText.trim(), selectedRoomId === 'general' ? undefined : selectedRoomId);
    setInputText('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-10rem)]">
      {/* Room Sidebar */}
      <Card className="md:col-span-1 flex flex-col h-full">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Chat Rooms
            </span>
            <Badge variant="secondary" className="text-xs">{rooms.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1 flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm text-left transition-colors ${
                selectedRoomId === room.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-accent text-foreground'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {room.isPublic ? <Globe className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
                <span className="truncate">{room.name}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="md:col-span-3 flex flex-col h-full">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {activeRoom?.isPublic ? <Globe className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-amber-500" />}
              {activeRoom?.name || 'General Chat'}
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              AES-256 Encrypted Stream
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Local Subnet
          </Badge>
        </CardHeader>

        {/* Messages Stream */}
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
          {currentRoomMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">No messages in this room yet.</p>
              <p className="text-xs mt-1">Start the conversation with your LAN peers!</p>
            </div>
          ) : (
            currentRoomMessages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{msg.senderName}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-muted text-foreground rounded-tl-none border'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Message Input Bar */}
        <div className="p-3 border-t bg-card">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${activeRoom?.name || 'general'}...`}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!inputText.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
