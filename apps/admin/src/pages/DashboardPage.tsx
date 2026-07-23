import { DollarSign, ShoppingCart, Users, Package } from "lucide-react";

const stats = [
  { label: "Total Revenue", value: "$48,290", change: "+12.5%", icon: DollarSign },
  { label: "Orders", value: "1,243", change: "+8.2%", icon: ShoppingCart },
  { label: "Customers", value: "3,847", change: "+5.1%", icon: Users },
  { label: "Products", value: "186", change: "+2.3%", icon: Package },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-line rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted">{stat.label}</span>
              <stat.icon size={18} className="text-muted" />
            </div>
            <p className="text-2xl font-semibold text-ink">{stat.value}</p>
            <p className="text-xs text-success mt-1">{stat.change} from last month</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-6">
        <h2 className="text-lg font-medium text-ink mb-4">Recent Activity</h2>
        <p className="text-sm text-muted">No recent activity to display.</p>
      </div>
    </div>
  );
}
