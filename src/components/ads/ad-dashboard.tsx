import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { formatUsd } from "@/lib/ads/packages";
import type { AdvertiserCampaign } from "@/lib/ads/queries";
import { type Locale, withLocale } from "@/lib/locale-routing";

import { AdAnalyticsTabs } from "@/components/ads/ad-analytics-tabs";

export async function AdDashboard({
  campaigns,
  locale,
}: {
  campaigns: AdvertiserCampaign[];
  locale: Locale;
}) {
  const t = await getTranslations("advertise.dashboard");
  const createHref = withLocale("/advertise/new", locale);

  if (campaigns.length === 0) {
    return (
      <div className="rounded-[2rem] border border-border-base bg-surface/82 p-8 text-center shadow-xl shadow-blue-950/5 backdrop-blur">
        <p className="font-mono text-[11px] tracking-[0.22em] text-brand uppercase">
          {t("empty.eyebrow")}
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          {t("empty.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-2">
          {t("empty.body")}
        </p>
        <Link
          href={createHref}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-inverse px-5 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover"
        >
          {t("empty.cta")}
        </Link>
      </div>
    );
  }

  const totalServed = campaigns.reduce(
    (sum, campaign) =>
      sum + Math.min(campaign.viewsServed, campaign.packageViews),
    0,
  );
  const totalClicks = campaigns.reduce(
    (sum, campaign) => sum + campaign.clicks,
    0,
  );
  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active" && !campaign.deletedAt,
  ).length;
  const ctr = totalServed > 0 ? (totalClicks / totalServed) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label={t("summary.total")}
          value={formatViews(campaigns.length)}
        />
        <SummaryCard
          label={t("summary.active")}
          value={formatViews(activeCampaigns)}
        />
        <SummaryCard
          label={t("summary.served")}
          value={formatViews(totalServed)}
        />
        <SummaryCard
          label={t("summary.clicks")}
          value={formatViews(totalClicks)}
        />
        <SummaryCard label={t("summary.ctr")} value={`${ctr.toFixed(2)}%`} />
      </div>

      {campaigns.map((campaign) => {
        const served = Math.min(campaign.viewsServed, campaign.packageViews);
        const remaining = Math.max(campaign.packageViews - served, 0);
        const progress = Math.round((served / campaign.packageViews) * 100);
        const ctr = served > 0 ? (campaign.clicks / served) * 100 : 0;
        const editable = campaign.status !== "deleted" && !campaign.deletedAt;
        const editHref = withLocale(
          `/advertise/dashboard/${campaign.id}/edit`,
          locale,
        );
        return (
          <article
            key={campaign.id}
            className="rounded-[2rem] border border-border-base bg-surface/82 p-5 shadow-sm shadow-blue-950/5 backdrop-blur md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
                  {campaign.companyName}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {campaign.title}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={campaign.status} />
                {editable ? (
                  <Link
                    href={editHref}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-border-base bg-background px-4 text-sm font-medium text-foreground transition hover:border-brand/60 hover:text-brand"
                  >
                    {t("editCreative")}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[180px_1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border-base bg-background lg:aspect-square">
                <Image
                  src={campaign.imageUrl}
                  alt=""
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="max-w-2xl text-sm leading-6 text-muted-2">
                  {campaign.description}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label={t("metrics.package")}
                    value={formatViews(campaign.packageViews)}
                  />
                  <Metric
                    label={t("metrics.served")}
                    value={formatViews(served)}
                  />
                  <Metric
                    label={t("metrics.remaining")}
                    value={formatViews(remaining)}
                  />
                  <Metric
                    label={t("metrics.spend")}
                    value={formatUsd(campaign.priceCents)}
                  />
                  <Metric
                    label={t("metrics.clicks")}
                    value={formatViews(campaign.clicks)}
                  />
                  <Metric
                    label={t("metrics.ctr")}
                    value={`${ctr.toFixed(2)}%`}
                  />
                  <Metric
                    label={t("metrics.avgTime")}
                    value={formatDuration(campaign.avgTimeInViewMs)}
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
                    <span>{t("progress")}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {campaign.status === "deleted" ? (
                  <p className="mt-4 rounded-2xl bg-chip-danger-bg p-3 text-sm text-chip-danger-fg">
                    {campaign.removalReason ?? t("removedFallback")}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-2">
                  <a
                    href={campaign.destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-brand underline-offset-4 hover:underline"
                  >
                    {t("destination")}
                    <ExternalLink className="size-3.5" />
                  </a>
                  <span>
                    {t("created", { date: formatDate(campaign.createdAt) })}
                  </span>
                  {campaign.activatedAt ? (
                    <span>
                      {t("activated", {
                        date: formatDate(campaign.activatedAt),
                      })}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-border-base bg-background/50 p-3">
              <AdAnalyticsTabs
                series={campaign.timeSeries}
                labels={{
                  eightHours: t("chart.windows.eightHours"),
                  day: t("chart.windows.day"),
                  week: t("chart.windows.week"),
                  month: t("chart.windows.month"),
                }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-border-base bg-surface/80 p-4 backdrop-blur">
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-chip-success-bg text-chip-success-fg"
      : status === "deleted" || status === "paused"
        ? "bg-chip-danger-bg text-chip-danger-fg"
        : "bg-chip-warning-bg text-chip-warning-fg";
  return (
    <span
      className={`rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-base bg-background p-3">
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatViews(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(value: number): string {
  if (value <= 0) return "0s";
  return `${(value / 1000).toFixed(1)}s`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}
