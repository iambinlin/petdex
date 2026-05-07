"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AdvertiserCampaign } from "@/lib/ads/queries";

import { AdCard } from "@/components/ads/ad-card";

type EditableCampaign = Pick<
  AdvertiserCampaign,
  | "id"
  | "title"
  | "description"
  | "imageUrl"
  | "destinationUrl"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmTerm"
  | "utmContent"
>;

type SaveState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function AdCampaignEditDialog({
  campaign,
  triggerLabel,
}: {
  campaign: EditableCampaign;
  triggerLabel: string;
}) {
  const t = useTranslations("advertise.dashboard.edit");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [destinationUrl, setDestinationUrl] = useState(campaign.destinationUrl);
  const [utmSource, setUtmSource] = useState(campaign.utmSource ?? "");
  const [utmMedium, setUtmMedium] = useState(campaign.utmMedium ?? "");
  const [utmCampaign, setUtmCampaign] = useState(campaign.utmCampaign ?? "");
  const [utmTerm, setUtmTerm] = useState(campaign.utmTerm ?? "");
  const [utmContent, setUtmContent] = useState(campaign.utmContent ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const isBusy = state.kind === "uploading" || state.kind === "saving";
  const previewAd = {
    id: campaign.id,
    title: title.trim() || campaign.title,
    description: description.trim() || campaign.description,
    imageUrl: previewUrl ?? uploadedImageUrl ?? campaign.imageUrl,
    clickUrl: destinationUrl.trim() || campaign.destinationUrl,
  };

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [imageFile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "idle" });

    try {
      let nextImageUrl = uploadedImageUrl;
      if (imageFile && !nextImageUrl) {
        if (imageFile.size > MAX_IMAGE_BYTES) {
          setState({ kind: "error", message: t("errors.imageTooLarge") });
          return;
        }
        setState({ kind: "uploading" });
        nextImageUrl = await uploadImage(imageFile);
        setUploadedImageUrl(nextImageUrl);
      }

      const patch = buildPatch({
        campaign,
        title,
        description,
        destinationUrl,
        imageUrl: nextImageUrl ?? campaign.imageUrl,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
      });

      if (Object.keys(patch).length === 0) {
        setState({ kind: "error", message: t("errors.nothingChanged") });
        return;
      }

      setState({ kind: "saving" });
      const res = await fetch(`/api/ads/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(mapError(data.error, t));
      }

      setOpen(false);
      setImageFile(null);
      setUploadedImageUrl(null);
      setState({ kind: "idle" });
      router.refresh();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : t("errors.network"),
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-full border border-border-base bg-background px-4 text-sm font-medium text-foreground transition hover:border-brand/60 hover:text-brand"
      >
        {triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-ad-${campaign.id}`}
            className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-border-base bg-surface p-5 shadow-2xl shadow-blue-950/15 md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={`edit-ad-${campaign.id}`}
                  className="text-2xl font-semibold tracking-tight text-foreground"
                >
                  {t("title")}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-2">
                  {t("body")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm text-muted-2 transition hover:bg-background hover:text-foreground"
              >
                {t("cancel")}
              </button>
            </div>

            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="mt-5 grid gap-5 md:grid-cols-[1fr_minmax(260px,320px)]"
            >
              <div className="space-y-4">
                <Field
                  label={t("titleLabel")}
                  name="title"
                  value={title}
                  maxLength={80}
                  required
                  onChange={setTitle}
                />
                <label>
                  <span className="text-sm font-medium text-foreground">
                    {t("descriptionLabel")}
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={180}
                    required
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-border-base bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-3 focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
                  />
                </label>
                <Field
                  label={t("destinationUrlLabel")}
                  name="destinationUrl"
                  type="url"
                  value={destinationUrl}
                  required
                  onChange={setDestinationUrl}
                />

                <details className="rounded-2xl border border-border-base bg-background p-4">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    {t("utmTitle")}
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-muted-2">
                    {t("utmHelp")}
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field
                      label="utm_source"
                      name="utmSource"
                      value={utmSource}
                      onChange={setUtmSource}
                    />
                    <Field
                      label="utm_medium"
                      name="utmMedium"
                      value={utmMedium}
                      onChange={setUtmMedium}
                    />
                    <Field
                      label="utm_campaign"
                      name="utmCampaign"
                      value={utmCampaign}
                      onChange={setUtmCampaign}
                    />
                    <Field
                      label="utm_term"
                      name="utmTerm"
                      value={utmTerm}
                      onChange={setUtmTerm}
                    />
                    <Field
                      label="utm_content"
                      name="utmContent"
                      value={utmContent}
                      onChange={setUtmContent}
                    />
                  </div>
                </details>

                <div>
                  <span className="text-sm font-medium text-foreground">
                    {t("imageLabel")}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-base bg-background px-4 py-6 text-sm text-muted-2 transition hover:border-brand/60 hover:text-foreground"
                  >
                    <Upload className="size-4" />
                    {imageFile ? imageFile.name : t("imageCta")}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      setImageFile(event.target.files?.[0] ?? null);
                      setUploadedImageUrl(null);
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-3">{t("imageHelp")}</p>
                </div>

                {state.kind === "error" ? (
                  <p className="rounded-2xl bg-chip-danger-bg p-3 text-sm text-chip-danger-fg">
                    {state.message}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-inverse px-5 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {state.kind === "uploading"
                      ? t("uploading")
                      : state.kind === "saving"
                        ? t("saving")
                        : t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-border-base bg-background px-5 text-sm font-medium text-foreground transition hover:border-border-strong"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>

              <aside className="rounded-2xl border border-border-base bg-background p-3">
                <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
                  {t("currentImage")}
                </p>
                <AdCard ad={previewAd} disableNavigation />
              </aside>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  required,
  maxLength,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  required?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-full border border-border-base bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-muted-3 focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildPatch({
  campaign,
  title,
  description,
  imageUrl,
  destinationUrl,
  utmSource,
  utmMedium,
  utmCampaign,
  utmTerm,
  utmContent,
}: {
  campaign: EditableCampaign;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
}) {
  const patch: Record<string, string | null> = {};
  if (title !== campaign.title) patch.title = title;
  if (description !== campaign.description) patch.description = description;
  if (imageUrl !== campaign.imageUrl) patch.imageUrl = imageUrl;
  if (destinationUrl !== campaign.destinationUrl) {
    patch.destinationUrl = destinationUrl;
  }
  const utmValues = {
    utmSource: nullableText(utmSource),
    utmMedium: nullableText(utmMedium),
    utmCampaign: nullableText(utmCampaign),
    utmTerm: nullableText(utmTerm),
    utmContent: nullableText(utmContent),
  };
  for (const [key, value] of Object.entries(utmValues)) {
    if (value !== campaign[key as keyof EditableCampaign]) {
      patch[key] = value;
    }
  }
  return patch;
}

function mapError(
  error: string | undefined,
  t: ReturnType<typeof useTranslations>,
): string {
  if (error === "nothing_changed" || error === "no_edit_fields") {
    return t("errors.nothingChanged");
  }
  if (error === "image_url_invalid") return t("errors.imageInvalid");
  if (error === "destination_url_invalid")
    return t("errors.destinationInvalid");
  if (error === "title_required") return t("errors.titleRequired");
  if (error === "description_required") return t("errors.descriptionRequired");
  return t("errors.submitFailed");
}

async function uploadImage(file: File): Promise<string> {
  const presignRes = await fetch("/api/ads/image/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  const presignData = (await presignRes.json()) as {
    uploadUrl?: string;
    publicUrl?: string;
    error?: string;
  };
  if (!presignRes.ok || !presignData.uploadUrl || !presignData.publicUrl) {
    throw new Error(presignData.error ?? "Upload failed.");
  }

  const putRes = await fetch(presignData.uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Image upload failed.");
  return presignData.publicUrl;
}
