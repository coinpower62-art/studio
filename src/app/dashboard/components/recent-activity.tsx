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

const activities = [
  {
    id: "1",
    date: "2023-10-26",
    type: "Buy",
    asset: "Bitcoin (BTC)",
    amount: "+0.05 BTC",
    value: "+$2,100.50",
    status: "Completed",
  },
  {
    id: "2",
    date: "2023-10-25",
    type: "Sell",
    asset: "Ethereum (ETH)",
    amount: "-1.2 ETH",
    value: "+$2,050.00",
    status: "Completed",
  },
  {
    id: "3",
    date: "2023-10-24",
    type: "Deposit",
    asset: "USD",
    amount: "+$5,000.00",
    value: "",
    status: "Completed",
  },
  {
    id: "4",
    date: "2023-10-22",
    type: "Buy",
    asset: "Solana (SOL)",
    amount: "+10 SOL",
    value: "+$450.00",
    status: "Pending",
  },
  {
    id: "5",
    date: "2023-10-20",
    type: "Withdrawal",
    asset: "USD",
    amount: "-$1,000.00",
    value: "",
    status: "Failed",
  },
];

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Completed: "default",
  Pending: "secondary",
  Failed: "destructive",
}

export function RecentActivity() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>A log of your recent transactions and activities.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Amount / Value</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="font-medium">{activity.date}</TableCell>
                <TableCell>{activity.type}</TableCell>
                <TableCell>{activity.asset}</TableCell>
                <TableCell className="text-right">
                  <div>{activity.amount}</div>
                  <div className={`text-xs ${activity.amount.startsWith('+') ? 'text-growth' : 'text-destructive'}`}>{activity.value}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={statusVariant[activity.status] || 'outline'} className="bg-primary/20 text-primary-foreground hover:bg-primary/30">
                    {activity.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
