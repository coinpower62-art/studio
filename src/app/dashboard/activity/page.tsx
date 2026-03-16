'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, Timestamp } from "firebase/firestore";
import { useMemo } from "react";
import { Loader } from "lucide-react";

type Activity = {
  id: string;
  date: Date;
  type: "Deposit" | "Withdrawal";
  asset: string;
  amount: number;
  status: "Completed" | "Pending" | "Failed";
};

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Completed: "default",
  Pending: "secondary",
  Failed: "destructive",
}

function ActivityRow({ activity }: { activity: Activity }) {
  const isDeposit = activity.type === 'Deposit';
  return (
    <TableRow key={activity.id}>
      <TableCell className="font-medium">{activity.date.toLocaleDateString()}</TableCell>
      <TableCell>{activity.type}</TableCell>
      <TableCell>{activity.asset}</TableCell>
      <TableCell className={`text-right font-medium ${isDeposit ? 'text-growth' : 'text-destructive'}`}>
        {isDeposit ? '+' : '-'}GHS {activity.amount.toFixed(2)}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant={statusVariant[activity.status] || 'outline'}>
          {activity.status}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export default function ActivityPage() {
  const { firestore, user } = useFirebase();

  const depositsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'depositRequests'), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const withdrawalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'withdrawalRequests'), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: deposits, isLoading: depositsLoading } = useCollection(depositsQuery);
  const { data: withdrawals, isLoading: withdrawalsLoading } = useCollection(withdrawalsQuery);
  
  const activities = useMemo(() => {
    if (!deposits || !withdrawals) return [];

    const mapStatus = (status: string): "Completed" | "Pending" | "Failed" => {
      switch (status) {
        case 'pending': return 'Pending';
        case 'approved': return 'Completed';
        case 'rejected': return 'Failed';
        default: return 'Pending';
      }
    };

    const depositsActivities: Activity[] = deposits.map((d: any) => ({
      id: d.id,
      date: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
      type: 'Deposit',
      asset: 'GHS',
      amount: d.amount,
      status: mapStatus(d.status),
    }));

    const withdrawalsActivities: Activity[] = withdrawals.map((w: any) => ({
      id: w.id,
      date: w.createdAt instanceof Timestamp ? w.createdAt.toDate() : new Date(),
      type: 'Withdrawal',
      asset: 'GHS',
      amount: w.amount,
      status: mapStatus(w.status),
    }));

    return [...depositsActivities, ...withdrawalsActivities].sort((a, b) => b.date.getTime() - a.date.getTime());

  }, [deposits, withdrawals]);
  
  const isLoading = depositsLoading || withdrawalsLoading;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Activity Room</h1>
      <p className="text-muted-foreground">
        A log of all your recent activities on the platform.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>A log of your recent transactions and activities.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : activities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 px-6 bg-card border rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold">No Activity Yet</h3>
                <p className="text-muted-foreground mt-2">
                    Your recent transactions will appear here.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
