import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileImage, FileSpreadsheet, Mic, Square, X, Loader2 } from 'lucide-react';

export type AttachmentType = 'image' | 'csv' | 'excel' | 'audio';

export interface ChatAttachment {
    id: string;
    type: AttachmentType;
    name: string;
    data: string;
    mimeType: string;
    transcription?: string;
}

interface ChatAttachmentsProps {
    attachments: ChatAttachment[];
    onAddAttachment: (attachment: ChatAttachment) => void;
    onRemoveAttachment: (id: string) => void;
    disabled?: boolean;
}

export function ChatAttachments({
    attachments,
    onAddAttachment,
    onRemoveAttachment,
    disabled = false,
}: ChatAttachmentsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setIsProcessing(true);

            try {
                const fileType = getFileType(file);
                if (!fileType) {
                    throw new Error('Unsupported file type');
                }

                const base64 = await fileToBase64(file);
                const attachment: ChatAttachment = {
                    id: crypto.randomUUID(),
                    type: fileType,
                    name: file.name,
                    data: base64,
                    mimeType: file.type,
                };

                if (fileType === 'csv' || fileType === 'excel') {
                    const text = await parseSpreadsheet(file, fileType);
                    attachment.data = text;
                }

                onAddAttachment(attachment);
            } catch (error) {
                console.error('Error processing file:', error);
            } finally {
                setIsProcessing(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        },
        [onAddAttachment]
    );

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                setIsProcessing(true);
                try {
                    const base64 = await blobToBase64(audioBlob);
                    const attachment: ChatAttachment = {
                        id: crypto.randomUUID(),
                        type: 'audio',
                        name: `Audio ${new Date().toLocaleTimeString()}`,
                        data: base64,
                        mimeType: 'audio/webm',
                    };
                    onAddAttachment(attachment);
                } catch (error) {
                    console.error('Error processing audio:', error);
                } finally {
                    setIsProcessing(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }, [onAddAttachment]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    return (
        <div className="flex items-center gap-1">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isProcessing}
            />

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                title="Attach file (image, CSV, Excel)"
            >
                {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileImage className="h-4 w-4" />
                )}
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', isRecording && 'text-red-500 hover:text-red-600')}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled || isProcessing}
                title={isRecording ? 'Stop recording' : 'Record audio'}
            >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            {attachments.length > 0 && (
                <div className="flex items-center gap-1 ml-2">
                    {attachments.map((att) => (
                        <div
                            key={att.id}
                            className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs"
                        >
                            {att.type === 'image' && <FileImage className="h-3 w-3" />}
                            {(att.type === 'csv' || att.type === 'excel') && <FileSpreadsheet className="h-3 w-3" />}
                            {att.type === 'audio' && <Mic className="h-3 w-3" />}
                            <span className="max-w-[80px] truncate">{att.name}</span>
                            <button
                                type="button"
                                onClick={() => onRemoveAttachment(att.id)}
                                className="hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function getFileType(file: File): AttachmentType | null {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) return 'csv';
    if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
    ) {
        return 'excel';
    }
    return null;
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function parseSpreadsheet(file: File, type: 'csv' | 'excel'): Promise<string> {
    if (type === 'csv') {
        return await file.text();
    }

    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheets: string[] = [];
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
    }

    return sheets.join('\n\n');
}

export function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
    if (attachment.type === 'image') {
        return (
            <img
                src={`data:${attachment.mimeType};base64,${attachment.data}`}
                alt={attachment.name}
                className="max-w-[200px] max-h-[150px] rounded-md object-contain"
            />
        );
    }

    if (attachment.type === 'audio') {
        return (
            <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                <Mic className="h-4 w-4" />
                <span className="text-sm">{attachment.name}</span>
                {attachment.transcription && (
                    <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                        "{attachment.transcription}"
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-sm">{attachment.name}</span>
        </div>
    );
}
