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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMe, useRegisterUser, useChangePassword, useUsers, useUpdateUserRole, useDeleteUser } from '@/lib/query/auth';
import { useHealth } from '@/lib/query/health';
import { getErrorMessage } from '@/lib/api/axios';
import { toast } from '@/stores/toast-store';
import { UserRole } from '@rscb/shared';
import {
  Settings,
  LogOut,
  User,
  UserPlus,
  KeyRound,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  displayName: z.string().optional(),
  password: z.string().min(4, 'Password minimal 4 karakter'),
  role: z.nativeEnum(UserRole),
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
    defaultValues: { username: '', displayName: '', password: '', role: UserRole.OPERATOR },
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
  const isAdmin = user?.role === UserRole.ADMIN;
  const { data: users } = useUsers(isAdmin);
  const updateUserRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const handleChangeRole = async (target: { id: string; username: string }, role: UserRole) => {
    try {
      await updateUserRole.mutateAsync({ id: target.id, role });
      toast({ title: 'Role diubah', description: target.username, variant: 'success' });
    } catch (error) {
      toast({
        title: 'Gagal mengubah role',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (target: { id: string; username: string }) => {
    try {
      await deleteUser.mutateAsync(target.id);
      toast({ title: 'Pengguna dihapus', description: target.username, variant: 'success' });
    } catch (error) {
      toast({
        title: 'Gagal menghapus pengguna',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

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
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRole.OPERATOR}>Operator</SelectItem>
                        <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      </SelectContent>
                    </Select>
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

          {isAdmin && users && users.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Daftar Pengguna
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <span className="font-medium">{u.username}</span>
                        {u.username === user?.username && (
                          <span className="ml-2 text-xs text-muted-foreground">(anda)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(role) => handleChangeRole(u, role as UserRole)}
                          disabled={u.username === user?.username || updateUserRole.isPending}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.OPERATOR}>Operator</SelectItem>
                            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={u.username === user?.username || deleteUser.isPending}
                          onClick={() => handleDeleteUser(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">
                Role sendiri dan ADMIN terakhir tidak dapat dicabut/dihapus.
              </p>
            </div>
          )}
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
