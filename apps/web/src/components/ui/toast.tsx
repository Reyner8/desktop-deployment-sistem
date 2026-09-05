import { useToastStore } from '@/stores/toast-store';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-2 rounded-md border px-4 py-3 shadow-md text-sm min-w-[280px]',
            t.variant === 'destructive' && 'border-destructive bg-destructive/10 text-destructive',
            t.variant === 'success' && 'border-green-500 bg-green-50 text-green-800',
            (!t.variant || t.variant === 'default') && 'border-border bg-background',
          )}
        >
          <div className="flex-1">
            {t.title && <p className="font-medium">{t.title}</p>}
            {t.description && <p className="text-muted-foreground">{t.description}</p>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}