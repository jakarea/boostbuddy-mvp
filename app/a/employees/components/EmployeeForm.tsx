"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import { createEmployeeAction } from "@/app/actions/employee";

interface EmployeeFormProps {
  onCancel: () => void;
}

export default function EmployeeForm({ onCancel }: EmployeeFormProps) {
  const { t } = useTranslation("admin_employees");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "EMPLOYEE" as "ADMIN" | "EMPLOYEE",
    telegram_chat_id: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitting(false);
      return;
    }

    try {
      const result = await createEmployeeAction({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        telegram_chat_id: formData.telegram_chat_id || null
      });

      if (result.success) {
        onCancel(); // Go back to list
        // Optionally show success message
      } else {
        setErrors({ submit: result.error || "Failed to create employee" });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || "An error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500"
          onClick={onCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t("add_title", { defaultValue: "Add New Employee" })}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t("add_subtitle", { defaultValue: "Create a new admin or employee account" })}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 space-y-4 max-w-2xl">
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("form.name", { defaultValue: "Full Name" })} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 ${
              errors.name ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
            }`}
            placeholder={t("form.name_placeholder", { defaultValue: "Enter full name" })}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("form.email", { defaultValue: "Email Address" })} *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 ${
              errors.email ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
            }`}
            placeholder={t("form.email_placeholder", { defaultValue: "email@example.com" })}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("form.password", { defaultValue: "Password" })} *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 ${
              errors.password ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
            }`}
            placeholder={t("form.password_placeholder", { defaultValue: "Min. 6 characters" })}
          />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("form.confirm_password", { defaultValue: "Confirm Password" })} *
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 ${
              errors.confirmPassword ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
            }`}
            placeholder={t("form.confirm_password_placeholder", { defaultValue: "Re-enter password" })}
          />
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("form.role", { defaultValue: "Role" })} *
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "EMPLOYEE" })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
          >
            <option value="EMPLOYEE">{t("form.role_employee", { defaultValue: "Employee" })}</option>
            <option value="ADMIN">{t("form.role_admin", { defaultValue: "Admin" })}</option>
          </select>
          <p className="text-xs text-zinc-500 mt-1">
            {formData.role === "ADMIN"
              ? t("form.role_admin_desc", { defaultValue: "Full system access" })
              : t("form.role_employee_desc", { defaultValue: "Can manage assigned review orders" })
            }
          </p>
        </div>

        {/* Telegram Chat ID (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("form.telegram_chat_id", { defaultValue: "Telegram Chat ID (Optional)" })}
          </label>
          <input
            type="text"
            value={formData.telegram_chat_id}
            onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
            placeholder={t("form.telegram_placeholder", { defaultValue: "For Telegram notifications" })}
          />
          <p className="text-xs text-zinc-500 mt-1">
            {t("form.telegram_desc", { defaultValue: "Optional: For sending Telegram notifications" })}
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-[#168BB0] hover:bg-[#0F7493]"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("form.creating", { defaultValue: "Creating..." })}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("form.create", { defaultValue: "Create Employee" })}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("form.cancel", { defaultValue: "Cancel" })}
          </Button>
        </div>
      </form>
    </div>
  );
}