import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from '@/components/icons';

interface ReceiptDialogProps {
  receiptUrl: string;
  filename?: string;
  trigger: React.ReactNode;
}

export const ReceiptDialog = ({ receiptUrl, filename, trigger }: ReceiptDialogProps) => {
  const [open, setOpen] = useState(false);
  const isImage = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(receiptUrl);
  const isPdf = /\.pdf$/i.test(receiptUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Чек об оплате</DialogTitle>
          {filename && (
            <DialogDescription>{filename}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/50 rounded-lg p-4">
          {isImage ? (
            <img
              src={receiptUrl}
              alt={filename || 'Чек об оплате'}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          ) : isPdf ? (
            <iframe
              src={receiptUrl}
              className="w-full h-[70vh] rounded-lg border border-border"
              title={filename || 'Чек об оплате'}
            />
          ) : (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Предпросмотр недоступен</p>
              <Button asChild>
                <a href={receiptUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Скачать файл
                </a>
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
          <Button asChild>
            <a href={receiptUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

