"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Plus, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";

const useBosFetch = () => {
  const { user } = useAuth();
  return useCallback(
    async (url) => {
      if (!user) throw new Error("Authentication required");
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [user],
  );
};
function LoadingState() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
function useBosUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const bosFetch = useBosFetch();
  useEffect(() => {
    let active = true;
    bosFetch("/api/bos/users")
      .then((data) => active && setUsers(data.users || []))
      .catch((error) => toast.error(error.message || "Failed to load users"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [bosFetch]);
  return { users, loading };
}
function MetricCard({ label, value }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
function EmptyCompaniesCard() {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="mb-2">Create your first company</CardTitle>
        <CardDescription className="mb-6 max-w-md">
          Add company licence details and create its primary company
          administrator.
        </CardDescription>
        <Button asChild>
          <Link href="/bos/create-company">
            <Plus className="h-4 w-4" />
            Create Company
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
function UsersTable({ users }) {
  if (!users.length) return <EmptyCompaniesCard />;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Companies</CardTitle>
        </div>
        <CardDescription>
          Company administrators and their team usage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Admin</TableHead>
                <TableHead className="text-right">Teams</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.email || "No email"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{user.teamCount}</TableCell>
                  <TableCell className="text-right">
                    {user.memberCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/bos/companies/${user.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
export function BosDashboard() {
  const { users, loading } = useBosUsers();
  if (loading) return <LoadingState />;

  const teams = users.reduce(
    (sum, user) => sum + Number(user.teamCount || 0),
    0,
  );
  const members = users.reduce(
    (sum, user) => sum + Number(user.memberCount || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Companies" value={users.length} />
        <MetricCard label="Teams" value={teams} />
        <MetricCard label="Members" value={members} />
      </div>
      <UsersTable users={users.slice(0, 8)} />
    </div>
  );
}
export function BosUsersPage() {
  const { users, loading } = useBosUsers();
  return loading ? <LoadingState /> : <UsersTable users={users} />;
}
export function BosSettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const changePassword = async () => {
    if (!user || !currentPassword || newPassword.length < 6)
      return toast.error(
        "Enter your current password and a new password of at least 6 characters",
      );
    setLoading(true);
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, currentPassword),
      );
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };
  const resetPassword = async () => {
    if (!user?.email) return;
    await sendPasswordResetEmail(auth, user.email);
    toast.success("Reset link sent");
  };
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Account Security</CardTitle>
        </div>
        <CardDescription>
          Update the BOS administrator password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Current password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>New password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={changePassword} disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
          <Button variant="outline" onClick={resetPassword}>
            Email Reset Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
