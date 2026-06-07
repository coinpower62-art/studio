
import { getClientAdminData } from '../actions';
import ClientAdminDashboard from './ClientAdminDashboard';

export default async function AdminClientPage() {
  const { deposits, withdrawals } = await getClientAdminData();

  return (
    <ClientAdminDashboard 
      initialDeposits={deposits} 
      initialWithdrawals={withdrawals} 
    />
  );
}
