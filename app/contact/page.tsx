"use client";

import { useState } from "react";
import { useT } from "../i18n/Provider";
import {
  Button,
  Eyebrow,
  IconArrow,
  IconChat,
  IconClock,
  IconMail,
  IconPhone,
  IconPin,
} from "../design/ui";

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
  carId: string;
}

const EMPTY: FormState = { name: "", email: "", phone: "", message: "", carId: "" };

export default function ContactPage() {
  const t = useT();
  const c = t.contact;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) err.name = "!";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = "!";
    if (!form.message.trim()) err.message = "!";
    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }
    setSending(true);
    // Demo behaviour — wire to a real endpoint when ready.
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  };

  const inputCls = (k: keyof FormState) =>
    `w-full rounded-xl border bg-white px-3.5 py-3 text-[15px] text-neutral-900 transition-colors placeholder:text-neutral-400 focus:outline-none dark:bg-neutral-900 dark:text-neutral-100 ${
      errors[k]
        ? "border-red-400 focus:border-red-500"
        : "border-neutral-300 focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300"
    }`;
  const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400";

  const details: { I: typeof IconPin; label: string; val: string; mono?: boolean; href?: string }[] = [
    { I: IconPhone, label: c.phone, val: c.phoneVal, mono: true, href: "tel:" + c.phoneVal.replace(/\s/g, "") },
    { I: IconMail, label: "Email", val: c.emailVal, mono: true, href: "mailto:" + c.emailVal },
    { I: IconChat, label: "WhatsApp", val: c.whatsappVal, mono: true },
    { I: IconClock, label: c.hours, val: c.hoursVal },
  ];

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:pt-20">
        <div className="max-w-2xl">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">{c.title}</h1>
          <p className="mt-5 text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-400">{c.lead}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-20">
        {/* form */}
        <div className="lg:col-span-7">
          {sent ? (
            <div className="flex flex-col items-start rounded-2xl border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 6" />
                </svg>
              </span>
              <p className="mt-5 text-lg font-medium text-neutral-900 dark:text-white">{c.success}</p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setForm(EMPTY);
                }}
                className="mt-4 text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
              >
                {c.another}
              </button>
            </div>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-1">
                  <span className={labelCls}>{c.name}</span>
                  <input className={inputCls("name")} value={form.name} onChange={set("name")} placeholder={c.namePh} />
                </label>
                <label className="block sm:col-span-1">
                  <span className={labelCls}>{c.phone}</span>
                  <input className={inputCls("phone")} value={form.phone} onChange={set("phone")} placeholder={c.phonePh} />
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>{c.email}</span>
                  <input
                    type="email"
                    className={inputCls("email")}
                    value={form.email}
                    onChange={set("email")}
                    placeholder={c.emailPh}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>{c.carId}</span>
                  <input className={inputCls("carId")} value={form.carId} onChange={set("carId")} placeholder={c.carIdHint} />
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>{c.message}</span>
                  <textarea
                    rows={5}
                    className={inputCls("message") + " resize-none"}
                    value={form.message}
                    onChange={set("message")}
                    placeholder={c.messagePh}
                  />
                </label>
              </div>
              <div className="mt-6">
                <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto">
                  {sending ? c.sending : c.send}
                  {!sending && <IconArrow size={17} />}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* details */}
        <div className="space-y-6 lg:col-span-5">
          {/* locations */}
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="border-b border-neutral-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              {c.officesTitle}
            </div>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {c.offices.map((o, i) => (
                <li key={i} className="flex items-start gap-3.5 px-5 py-4">
                  <span className="mt-0.5 text-neutral-400">
                    <IconPin size={19} />
                  </span>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">{o.city}</div>
                    <div className="mt-0.5 text-[15px] text-neutral-800 dark:text-neutral-200">{o.address}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* phone / email / WhatsApp / hours */}
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {details.map((d, i) => (
                <li key={i} className="flex items-start gap-3.5 px-5 py-4">
                  <span className="mt-0.5 text-neutral-400">
                    <d.I size={19} />
                  </span>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">{d.label}</div>
                    {d.href ? (
                      <a
                        href={d.href}
                        className={`mt-0.5 block text-[15px] text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white ${
                          d.mono ? "font-mono" : ""
                        }`}
                      >
                        {d.val}
                      </a>
                    ) : (
                      <div className={`mt-0.5 text-[15px] text-neutral-800 dark:text-neutral-200 ${d.mono ? "font-mono" : ""}`}>
                        {d.val}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
