import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { getRequestAuthHeaders } from '@/lib/telegram';

interface ReceiptDialogProps {
  receiptUrl: string;
  filename?: string;
  trigger: React.ReactNode;
}

// Компонент для загрузки изображения с авторизацией
const AuthenticatedImage = ({ url, alt }: { url: string; alt?: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Проверяем, нужна ли авторизация (админский endpoint)
    const needsAuth = url.includes('/admin/order/') && url.includes('/receipt');
    
    if (!needsAuth) {
      // Для обычных URL используем напрямую
      setImageUrl(url);
      setLoading(false);
      return;
    }

    // Для админских URL загружаем через fetch с заголовками
    const loadImage = async () => {
      try {
        const headers = getRequestAuthHeaders();
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error('Failed to load image');
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setImageUrl(blobUrl);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Очистка blob URL при размонтировании
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Не удалось загрузить изображение</p>
      </div>
    );
  }

  return (
    <motion.img
      key="image"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      src={imageUrl}
      alt={alt || 'Чек об оплате'}
      className="max-w-full max-h-[70vh] object-contain rounded-lg"
    />
  );
};

// Компонент для загрузки PDF с авторизацией
const AuthenticatedPdf = ({ url, title }: { url: string; title?: string }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Проверяем, нужна ли авторизация (админский endpoint)
    const needsAuth = url.includes('/admin/order/') && url.includes('/receipt');
    
    if (!needsAuth) {
      // Для обычных URL используем напрямую
      setPdfUrl(url);
      setLoading(false);
      return;
    }

    // Для админских URL загружаем через fetch с заголовками
    const loadPdf = async () => {
      try {
        const headers = getRequestAuthHeaders();
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error('Failed to load PDF');
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setPdfUrl(blobUrl);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    // Очистка blob URL при размонтировании
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Не удалось загрузить PDF</p>
      </div>
    );
  }

  return (
    <motion.iframe
      key="pdf"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      src={pdfUrl}
      className="w-full h-[70vh] rounded-lg border border-border"
      title={title || 'Чек об оплате'}
    />
  );
};

export const ReceiptDialog = ({ receiptUrl, filename, trigger }: ReceiptDialogProps) => {
  const [open, setOpen] = useState(false);
  // Определяем тип файла по расширению в filename или по URL
  const fileExtension = filename 
    ? filename.toLowerCase().split('.').pop() 
    : receiptUrl.toLowerCase().split('.').pop()?.split('?')[0];
  const isImage = fileExtension && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';
  
  // Для админских endpoint определяем тип по content-type из ответа или используем оба варианта
  const isAdminEndpoint = receiptUrl.includes('/admin/order/') && receiptUrl.includes('/receipt');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Чек об оплате</DialogTitle>
          <DialogDescription>
            {filename || 'Просмотр чека об оплате'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/50 rounded-lg p-4">
          <AnimatePresence mode="wait">
            {isImage || (isAdminEndpoint && !isPdf) ? (
              <AuthenticatedImage url={receiptUrl} alt={filename || 'Чек об оплате'} />
            ) : isPdf ? (
              <AuthenticatedPdf url={receiptUrl} title={filename || 'Чек об оплате'} />
            ) : (
              <motion.div
                key="fallback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-4"
              >
                <p className="text-muted-foreground">Предпросмотр недоступен</p>
                <Button asChild>
                  <a 
                    href={receiptUrl} 
                    download 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={async (e) => {
                      // Для админских URL нужно загрузить через fetch с заголовками
                      if (isAdminEndpoint) {
                        e.preventDefault();
                        try {
                          const headers = getRequestAuthHeaders();
                          const response = await fetch(receiptUrl, { headers });
                          if (!response.ok) throw new Error('Failed to download');
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = filename || 'receipt';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(blobUrl);
                        } catch (err) {
                          console.error('Failed to download receipt', err);
                        }
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать файл
                  </a>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
          <Button asChild>
            <a 
              href={receiptUrl} 
              download 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={async (e) => {
                // Для админских URL нужно загрузить через fetch с заголовками
                if (isAdminEndpoint) {
                  e.preventDefault();
                  try {
                    const headers = getRequestAuthHeaders();
                    const response = await fetch(receiptUrl, { headers });
                    if (!response.ok) throw new Error('Failed to download');
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename || 'receipt';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                  } catch (err) {
                    console.error('Failed to download receipt', err);
                  }
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

