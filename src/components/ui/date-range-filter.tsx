import { Input } from "@/components/ui/input";

type DateRangeFilterProps = {
  endDate?: string;
  startDate?: string;
};

export function DateRangeFilter({ endDate, startDate }: DateRangeFilterProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="form-field">
        <label className="form-label" htmlFor="startDate">
          Tanggal mulai
        </label>
        <Input defaultValue={startDate} id="startDate" name="startDate" type="date" />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="endDate">
          Tanggal akhir
        </label>
        <Input defaultValue={endDate} id="endDate" name="endDate" type="date" />
      </div>
    </div>
  );
}
