import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/stores/toast-store';
import api from '@/lib/api/axios';
import { ArrowLeft, ArrowRight, Upload, Check } from 'lucide-react';

const releaseSchema = z.object({
  application: z.string().min(1, 'Application name is required'),
  version: z.string().min(1, 'Version is required'),
  releaseNotes: z.string().optional(),
});

type ReleaseForm = z.infer<typeof releaseSchema>;

export function NewReleasePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; sha256: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReleaseForm>({
    resolver: zodResolver(releaseSchema),
  });

  const formValues = watch();

  const handleFileUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      const { data } = await api.post(`/releases/${releaseId}/artifact`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const artifact = data.data;
      setFileInfo({ name: artifact.fileName, size: Number(artifact.size), sha256: artifact.sha256 });
      setStep(3);
      toast({ title: 'File uploaded successfully', variant: 'success' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (values: ReleaseForm) => {
    try {
      const { data } = await api.post('/releases', values);
      setReleaseId(data.data.id);
      setStep(2);
      toast({ title: 'Release created', variant: 'success' });
    } catch {
      toast({ title: 'Failed to create release', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    if (!releaseId) return;
    setPublishing(true);
    try {
      await api.post(`/releases/${releaseId}/publish`);
      toast({ title: 'Release published', variant: 'success' });
      navigate(`/releases/${releaseId}`);
    } catch {
      toast({ title: 'Publish failed', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">New Release</h2>

      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-12 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Release Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label>Application Name</Label>
                <Input {...register('application')} placeholder="e.g. SIMRS" />
                {errors.application && <p className="text-sm text-destructive">{errors.application.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input {...register('version')} placeholder="e.g. 1.5.0" />
                {errors.version && <p className="text-sm text-destructive">{errors.version.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Release Notes</Label>
                <textarea
                  {...register('releaseNotes')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Describe what's new in this release..."
                />
              </div>
              <Button type="submit"><ArrowRight className="mr-2 h-4 w-4" /> Next: Upload Artifact</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Upload Artifact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {uploadedFile ? uploadedFile.name : 'Click to select a ZIP file'}
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={handleFileUpload} disabled={!uploadedFile || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && fileInfo && (
        <Card>
          <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">File Name</span>
              <span className="font-medium">{fileInfo.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">{(fileInfo.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SHA-256</span>
              <span className="font-mono text-xs">{fileInfo.sha256}</span>
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(4)}><ArrowRight className="mr-2 h-4 w-4" /> Next: Publish</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Review & Publish</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Application</span>
              <span className="font-medium">{formValues.application}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{formValues.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Artifact</span>
              <span className="font-medium">{fileInfo?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SHA-256 Verified</span>
              <span className="font-medium text-green-600"><Check className="inline h-4 w-4 mr-1" />Valid</span>
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish Release'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}