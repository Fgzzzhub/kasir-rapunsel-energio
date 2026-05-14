import { CalendarCheck, Clock, HandCoins, UserX, WalletCards } from "lucide-react";
import Link from "next/link";

import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { ATTENDANCE_STATUS_OPTIONS } from "@/lib/constants/attendance";
import { getAttendanceRecords } from "@/lib/data/attendance";
import { getEmployees } from "@/lib/data/employees";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedProfile();
  const params = await searchParams;
  const scope =
    session.profile.role === "owner" && params.scope === "combined" ? "combined" : "selected";
  const filters = {
    employeeId: typeof params.employeeId === "string" ? params.employeeId : undefined,
    endDate: typeof params.endDate === "string" ? params.endDate : undefined,
    scope,
    startDate: typeof params.startDate === "string" ? params.startDate : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
  };

  const [employees, attendance] = await Promise.all([
    getEmployees({
      businessId: session.selectedBusiness.id,
      role: session.profile.role,
      scope,
    }),
    getAttendanceRecords({
      businessId: session.selectedBusiness.id,
      employeeId: filters.employeeId,
      endDate: filters.endDate,
      role: session.profile.role,
      scope,
      startDate: filters.startDate,
      status: filters.status,
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="theme-pill">
              {scope === "combined" ? "Seluruh Cabang" : session.selectedBusiness.name}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Attendance System</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Absensi Karyawan</h1>
          <p className="max-w-2xl text-muted-foreground">
            Monitor kehadiran tim dan kelola tunjangan makan secara otomatis untuk akurasi penggajian.
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <Card className="glow-ring overflow-visible">
        <form className="grid gap-4 p-2 md:grid-cols-2 xl:grid-cols-6">
          {session.profile.role === "owner" ? (
            <div className="form-field">
              <label className="form-label text-[10px] uppercase">Cakupan Bisnis</label>
              <Select defaultValue={filters.scope || "selected"} name="scope">
                <SelectTrigger id="scope" className="w-full">
                  <SelectValue placeholder="Cakupan Bisnis" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="selected">{session.selectedBusiness.name}</SelectItem>
                  <SelectItem value="combined">Semua bisnis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="form-field">
            <label className="form-label text-[10px] uppercase">Filter Karyawan</label>
            <Select defaultValue={filters.employeeId || "all"} name="employeeId">
              <SelectTrigger id="employeeId" className="w-full">
                <SelectValue placeholder="Semua karyawan" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">Semua karyawan</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <label className="form-label text-[10px] uppercase">Status</label>
            <Select defaultValue={filters.status || "all"} name="status">
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">Semua status</SelectItem>
                {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <label className="form-label text-[10px] uppercase">Mulai</label>
            <Input defaultValue={attendance.startDate} id="startDate" name="startDate" type="date" />
          </div>
          <div className="form-field">
            <label className="form-label text-[10px] uppercase">Sampai</label>
            <Input defaultValue={attendance.endDate} id="endDate" name="endDate" type="date" />
          </div>
          <div className="flex items-end gap-2">
            <Button className="flex-1 h-11 glow-accent" type="submit">Terapkan</Button>
            <Link
              className="flex h-11 items-center justify-center rounded-xl border border-border/50 bg-surface-muted px-4 text-sm font-semibold hover:bg-surface-hover"
              href="/attendance"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      {/* Statistics Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          caption="Hadir"
          icon={<CalendarCheck className="h-5 w-5" />}
          title="Hadir"
          value={attendance.summary.present}
        />
        <StatCard
          caption="Absen"
          icon={<UserX className="h-5 w-5" />}
          title="Tidak Hadir"
          value={attendance.summary.absent}
        />
        <StatCard
          caption="Terlambat"
          icon={<Clock className="h-5 w-5" />}
          title="Terlambat"
          value={attendance.summary.late}
        />
        <StatCard
          caption="Setengah Hari"
          icon={<CalendarCheck className="h-5 w-5" />}
          title="Setengah"
          value={attendance.summary.halfDay}
        />
        <StatCard
          caption="Izin / Sakit"
          icon={<UserX className="h-5 w-5" />}
          title="Izin/Sakit"
          value={attendance.summary.leaveOrSick}
        />
        <StatCard
          caption="Total dibayarkan"
          icon={<HandCoins className="h-5 w-5" />}
          title="Uang Makan"
          value={<RupiahFormatter value={attendance.summary.totalMealAllowance} />}
        />
        <StatCard
          caption="Total potongan"
          icon={<WalletCards className="h-5 w-5" />}
          title="Potongan"
          value={<RupiahFormatter value={attendance.summary.totalDeduction} />}
        />
      </section>

      <div className="pt-4 border-t border-border/30">
        <AttendanceManager
          businesses={session.businesses}
          employees={employees.filter((employee) => employee.is_active)}
          records={attendance.records}
          role={session.profile.role}
          selectedBusinessId={session.selectedBusiness.id}
        />
      </div>
    </div>
  );
}
