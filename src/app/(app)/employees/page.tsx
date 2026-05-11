import { EmployeeManager } from "@/components/employees/employee-manager";
import { assertRoleAccess } from "@/lib/auth/permissions";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getEmployees } from "@/lib/data/employees";

export default async function EmployeesPage() {
  const session = await requireAuthenticatedProfile();

  assertRoleAccess(session.profile.role, ["owner"]);

  const employees = await getEmployees({
    businessId: session.selectedBusiness.id,
  });

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">{session.selectedBusiness.name}</span>
        <h1>Manajemen karyawan</h1>
        <p>
          Atur gaji pokok, komisi, dan status aktif karyawan untuk bisnis yang sedang dipilih.
        </p>
      </section>
      <EmployeeManager
        businessId={session.selectedBusiness.id}
        initialEmployees={employees}
      />
    </>
  );
}
