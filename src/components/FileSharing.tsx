"use client";

import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileTransfer } from '@/types';
import { 
  Upload, 
  Download, 
  File, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2
} from 'lucide-react';

export default function FileSharing() {
  const { currentUser, fileTransfers, updateFileTransfer, removeFileTransfer, sendFiles } = useApp();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = (files: FileList) => {
    if (!currentUser) return;
    // Delegate to encrypted file sender in context
    void sendFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Clear input so selecting the same file again triggers change
      e.currentTarget.value = '';
    }
  };

  const startDownload = (t: FileTransfer) => {
    if (!t.downloadUrl) return;
    const a = document.createElement('a');
    a.href = t.downloadUrl;
    a.download = t.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FileTransfer['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'transferring':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const myTransfers = fileTransfers.filter(t => t.senderId === currentUser?.id);
  const receivedTransfers = fileTransfers.filter(t => t.senderId !== currentUser?.id);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Share Files
          </CardTitle>
          <CardDescription>
            Upload files to share with other devices on the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {dragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">or</p>
            <label htmlFor="file-upload">
              <Button asChild>
                <span>Browse Files</span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* My Transfers */}
          {myTransfers.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-sm">My Shared Files</h3>
              {myTransfers.slice().reverse().map((transfer) => (
                <div key={transfer.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getStatusIcon(transfer.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{transfer.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(transfer.fileSize)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                        {transfer.status}
                      </Badge>
                      {transfer.status === 'completed' && (
                        <Button size="sm" variant="ghost" onClick={() => removeFileTransfer(transfer.id)} title="Remove from list">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  {transfer.status === 'transferring' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{transfer.progress}%</span>
                      </div>
                      <Progress value={transfer.progress} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Received Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Received Files
          </CardTitle>
          <CardDescription>
            Files shared by other users on the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receivedTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No files received yet</p>
              <p className="text-sm mt-2">Files shared by others will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedTransfers.slice().reverse().map((transfer) => (
                <div key={transfer.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getStatusIcon(transfer.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{transfer.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          From {transfer.senderName} • {formatFileSize(transfer.fileSize)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                      {transfer.status}
                    </Badge>
                  </div>
                  {transfer.status === 'transferring' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Downloading</span>
                        <span>{transfer.progress}%</span>
                      </div>
                      <Progress value={transfer.progress} />
                    </div>
                  )}
                  {transfer.status === 'completed' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" disabled={!transfer.downloadUrl} onClick={() => startDownload(transfer)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeFileTransfer(transfer.id)} title="Remove from list">
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}