import { getSettings } from "@/lib/settings";
import { razorpayConfigured } from "@/lib/razorpay";
import { deliveryConfigured } from "@/lib/delivery/factory";
import { emailConfigured } from "@/lib/email/mailer";
import SettingsForm from "@/components/admin/SettingsForm";

export const metadata = { title: "Settings · Admin" };

export default async function SettingsPage() {
  const settings = await getSettings();
  const integrations = [
    {
      name: "Razorpay payments",
      configured: razorpayConfigured(),
      hint: "Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in the environment. Until then, local checkout uses a development payment simulator.",
    },
    {
      name: "Delivery partner",
      configured: deliveryConfigured(),
      hint: "When the courier is finalized, set DELIVERY_PROVIDER + API credentials in the environment and add its adapter in src/lib/delivery. Orders don't need any changes.",
    },
    {
      name: "Transactional email (SMTP)",
      configured: emailConfigured(),
      hint: "Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM. Until then, emails are logged to the server console.",
    },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-5 font-display text-2xl">Settings</h1>

      <section className="mb-6 border border-cream-300 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Integrations</h2>
        <ul className="mt-3 space-y-3">
          {integrations.map((i) => (
            <li key={i.name} className="flex items-start gap-3">
              <span
                className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                  i.configured ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {i.configured ? "Connected" : "Pending"}
              </span>
              <div>
                <p className="text-sm font-medium">{i.name}</p>
                {!i.configured && <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{i.hint}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <SettingsForm initial={settings} />
    </div>
  );
}
