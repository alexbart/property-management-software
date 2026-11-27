import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { useAuth } from "../lib/auth";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account and access." />
      <Card className="space-y-4 p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted">Email</p>
          <p className="text-base font-medium text-text">{user.email}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted">Role</p>
          <p className="text-base font-medium text-text">{user.role}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted">Property access</p>
          {user.propertyMemberships.length > 0 ? (
            <ul className="list-inside list-disc text-sm text-text">
              {user.propertyMemberships.map((membership) => (
                <li key={membership.propertyId}>
                  {membership.propertyId} ({membership.role})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text">No property assignments</p>
          )}
        </div>
        {user.tenantLink ? (
          <div className="space-y-1">
            <p className="text-sm text-muted">Tenant record</p>
            <p className="text-sm text-text">{user.tenantLink.tenantId}</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}