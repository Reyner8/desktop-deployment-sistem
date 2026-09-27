import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <FileQuestion className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Page not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
        <Button className="mt-5" onClick={() => navigate('/dashboard')}>
          Kembali ke Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
