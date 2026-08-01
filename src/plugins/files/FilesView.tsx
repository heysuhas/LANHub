"use client";

import React, { useState, useCallback } from 'react';
import { useCoreState, coreStore } from '@/core/state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, File, CheckCircle, XCircle, Clock, Loader2, HardDrive } from 'lucide-react';
import { FileTransfer } from '@/types';

import { useApp } from '@/contexts/AppContext';

export function FilesView() {
  const { currentUser } = useCoreState();
  const { sendFiles, fileTransfers } = useApp();
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

  const handleFiles = async (filesList: FileList) => {
    if (!currentUser) return;
    await sendFiles(filesList);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Send Files to LAN
          </CardTitle>
          <CardDescription>Drag and drop files to broadcast to all connected LAN peers</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports any file type over local network</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer History / List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-500" />
            File Transfers
          </CardTitle>
          <CardDescription>Recent files shared across local network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
          {fileTransfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No files shared yet.
            </div>
          ) : (
            fileTransfers.map((t) => (
              <div key={t.id} className="p-3 border rounded-lg bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <File className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium text-sm truncate">{t.fileName}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{formatFileSize(t.fileSize)}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Shared by {t.senderName}</span>
                  {t.downloadUrl && (
                    <a
                      href={t.downloadUrl}
                      download={t.fileName}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
