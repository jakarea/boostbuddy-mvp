import PendingClient from "./pending-client";

export const metadata = {
  title: "Account Pending - BoostBuddy Employee",
};

export default async function EmployeePendingPage() {
  // This page is shown to inactive employees (deactivated by admin via
  // setEmployeeActiveStatusAction). The employee layout's guard at
  // app/e/layout.tsx sends inactive employees here, and the
  // currentPath !== '/e/pending' check prevents redirect loops.
  return <PendingClient />;
}
