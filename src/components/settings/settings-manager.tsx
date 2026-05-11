"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Store, Receipt, Webhook } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-state";
import { GoogleSheetsSyncPanel } from "./google-sheets-sync-panel";

type SettingsForm = {
  address: string;
  googleSheetsWebhookUrl: string;
  phone: string;
  receiptFooterText: string;
  serviceChargePercentage: number;
  taxPercentage: number;
};

type SettingsResponse = {
  data?: {
    address?: string | null;
    google_sheets_webhook_url?: string | null;
    phone?: string | null;
    receipt_footer_text?: string | null;
    service_charge_percentage?: number | string | null;
    tax_percentage?: number | string | null;
  } | null;
  error?: string;
};

type SheetsStatus = {
  configured: boolean;
  message: string;
};

export function SettingsManager({ businessId, sheetsStatus }: { businessId: string; sheetsStatus: SheetsStatus }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [form, setForm] = useState<SettingsForm>({
    address: "",
    phone: "",
    receiptFooterText: "",
    taxPercentage: 0,
    serviceChargePercentage: 0,
    googleSheetsWebhookUrl: "",
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/settings?businessId=${businessId}`);
      if (res.ok) {
        const { data } = (await res.json()) as SettingsResponse;
        if (data) {
          setForm({
            address: data.address || "",
            phone: data.phone || "",
            receiptFooterText: data.receipt_footer_text || "",
            taxPercentage: Number(data.tax_percentage) || 0,
            serviceChargePercentage: Number(data.service_charge_percentage) || 0,
            googleSheetsWebhookUrl: data.google_sheets_webhook_url || "",
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSettings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSettings]);

  const saveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, ...form }),
      });
      const data = (await res.json()) as SettingsResponse;
      if (!res.ok || data.error) throw new Error(data.error || "Gagal menyimpan pengaturan.");
      setStatusMessage({ type: 'success', text: "Pengaturan berhasil disimpan." });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: unknown) {
      setStatusMessage({ type: 'error', text: e instanceof Error ? e.message : "Gagal menyimpan pengaturan." });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profil Bisnis", icon: Store },
    { id: "pos", label: "Kasir & Struk", icon: Receipt },
    { id: "integration", label: "Integrasi", icon: Webhook },
  ];

  if (isLoading) return <LoadingState message="Memuat pengaturan..." />;

  return (
    <div className="flex flex-col gap-8">
      {/* Tabs Navigation */}
      <div className="inline-flex h-12 w-full items-center justify-start sm:justify-center rounded-xl bg-[var(--surface-muted)] p-1 text-muted-foreground overflow-x-auto shadow-inner border border-black/10 dark:border-white/5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-w-[120px] items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                isActive 
                  ? "bg-[var(--surface-elevated)] text-[var(--accent)] shadow-md glow-ring" 
                  : "hover:bg-[var(--surface-hover)] hover:text-foreground"
              }`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border font-medium animate-in fade-in slide-in-from-top-2 ${statusMessage.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Tab Panels */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {activeTab === "profile" && (
          <Card className="theme-card glow-ring">
            <CardHeader>
              <CardTitle>Profil Bisnis</CardTitle>
              <CardDescription>Atur alamat dan kontak yang ditampilkan di sistem dan struk.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveSettings}>
                <div className="form-field">
                  <label className="form-label">Alamat Lengkap</label>
                  <Textarea 
                    value={form.address} 
                    onChange={e => setForm({...form, address: e.target.value})} 
                    placeholder="Contoh: Jl. Sudirman No. 1..."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Nomor Telepon / WhatsApp</label>
                  <Input 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})} 
                    placeholder="Contoh: 08123456789" 
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit" disabled={isSaving} className="glow-accent">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Menyimpan..." : "Simpan Profil"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "pos" && (
          <Card className="theme-card glow-ring">
            <CardHeader>
              <CardTitle>Pengaturan Kasir & Struk</CardTitle>
              <CardDescription>Konfigurasi pajak, service charge, dan pesan di nota pembayaran.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveSettings}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="form-field">
                    <label className="form-label">Pajak (Tax) %</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.taxPercentage} 
                      onChange={e => setForm({...form, taxPercentage: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Biaya Layanan (Service Charge) %</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.serviceChargePercentage} 
                      onChange={e => setForm({...form, serviceChargePercentage: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Pesan Footer Struk</label>
                  <Textarea 
                    value={form.receiptFooterText} 
                    onChange={e => setForm({...form, receiptFooterText: e.target.value})} 
                    placeholder="Contoh: Terima kasih atas kunjungannya!"
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit" disabled={isSaving} className="glow-accent">
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "integration" && (
          <div className="space-y-6">
            <Card className="theme-card glow-ring">
              <CardHeader>
                <CardTitle>Webhook Google Sheets</CardTitle>
                <CardDescription>Atur endpoint webhook untuk integrasi sinkronisasi data.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={saveSettings}>
                  <div className="form-field">
                    <label className="form-label">URL Webhook</label>
                    <Input 
                      value={form.googleSheetsWebhookUrl} 
                      onChange={e => setForm({...form, googleSheetsWebhookUrl: e.target.value})} 
                      placeholder="https://script.google.com/macros/s/..." 
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={isSaving} className="glow-accent">
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Menyimpan..." : "Simpan Webhook"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="theme-card glow-ring border-t-4 border-t-[var(--accent)]">
              <CardHeader>
                <CardTitle>Sinkronisasi Manual</CardTitle>
                <CardDescription>
                  Jalankan proses sinkronisasi data ke Google Sheets secara paksa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleSheetsSyncPanel
                  configured={sheetsStatus.configured}
                  message={sheetsStatus.message}
                />
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
