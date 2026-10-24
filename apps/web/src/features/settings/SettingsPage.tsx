import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useMe, useRegisterUser, useChangePassword } from '@/lib/query/auth';
import { useHealth } from '@/lib/query/health';
import { getErrorMessage } from '@/lib/api/axios';
import { toast } from '@/stores/toast-store';
import { Settings, LogOut, User, UserPlus, KeyRound } from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  displayName: z.string().optional(),
  password: z.string().min(4, 'Password minimal 4 karakter'),
});

type RegisterForm = z.infer<typeof registerSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(4, 'Password baru minimal 4 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function SettingsPage() {
  const storedUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { data: profile } = useMe();
  const { data: health, isError: serverOffline } = useHealth();
  const registerUser = useRegisterUser();
  const changePassword = useChangePassword();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', displayName: '', password: '' },
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmitPassword = async (values: ChangePasswordForm) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({ title: 'Password berhasil diganti', variant: 'success' });
      passwordForm.reset();
    } catch (error) {
      toast({
        title: 'Gagal mengganti password',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: RegisterForm) => {
    try {
      const created = await registerUser.mutateAsync(values);
      toast({ title: 'Pengguna dibuat', description: created.username, variant: 'success' });
      form.reset();
    } catch (error) {
      toast({
        title: 'Gagal membuat pengguna',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const user = profile || storedUser;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold">Settings</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>User Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user?.username || '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Display Name</span>
            <span className="font-medium">{user?.displayName || '-'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4" noValidate>
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Saat Ini</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password Baru</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={changePassword.isPending}>
                <KeyRound className="mr-2 h-4 w-4" />
                {changePassword.isPending ? 'Menyimpan...' : 'Ganti Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Access Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="username baru" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Operator" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={registerUser.isPending}>
                <UserPlus className="mr-2 h-4 w-4" />
                {registerUser.isPending ? 'Menyimpan...' : 'Tambah Pengguna'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle>System Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Application</span>
            <span className="font-medium">RSCB Deployment System</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">{__APP_VERSION__}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Server Status</span>
            <span
              className={
                serverOffline ? 'font-medium text-destructive' : 'font-medium text-green-600'
              }
            >
              {serverOffline ? 'Offline' : 'Connected'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Server Time</span>
            <span className="font-medium">
              {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
