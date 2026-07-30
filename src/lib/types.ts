export type UserRole = "SUPER_ADMIN" | "STUDIO_ADMIN" | "STUDIO_STAFF";
export type LicenseTier = "TRIAL" | "BASIC" | "PROFESSIONAL" | "ENTERPRISE";
export type EventType = "PRE_WEDDING" | "BEFORE_WEDDING" | "WEDDING" | "BIRTHDAY" | "CUSTOM";
export type EventStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PaymentType = "ADVANCE" | "PARTIAL" | "FULL" | "EMI";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
export type ReminderType = "PRE_EVENT_CLIENT" | "PRE_EVENT_STUDIO" | "POST_EVENT_CLIENT" | "PAYMENT_DUE";
