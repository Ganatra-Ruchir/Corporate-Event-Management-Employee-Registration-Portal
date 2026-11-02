export type Role = "admin" | "employee";
export type EventStatus = "draft" | "published" | "cancelled";
export type RegistrationStatus = "registered" | "cancelled";

export type Organization = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};
export type Membership = {
  organization_id: string;
  user_id: string;
  role: Role;
  organization: Organization | null;
};
export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
};
export type EventRecord = {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description: string;
  category: string;
  location: string;
  start_at: string;
  end_at: string;
  capacity: number;
  status: EventStatus;
  created_at: string;
};
export type Registration = {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  registered_at: string;
  attended_at: string | null;
  profile?: Profile | null;
  event?: EventRecord | null;
};
export function niceDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  }).format(new Date(value));
}
export function dateInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
export function exportCsv(filename: string, columns: string[], rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) => {
    let s = String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const data = [columns, ...rows].map(row => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", data], { type: "text/csv;charset=utf-8" });
  const uri = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = uri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(uri);
}