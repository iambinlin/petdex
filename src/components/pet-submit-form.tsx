"use client";

import { useEffect, useMemo, useState } from "react";

import JSZip from "jszip";
import { CheckCircle2, FileArchive, Send, Upload } from "lucide-react";

import { petStates } from "@/lib/pet-states";

type ParsedPet = {
  displayName: string;
  description: string;
  id: string;
  spritesheetUrl?: string;
  issues: string[];
};

export function PetSubmitForm() {
  const [parsedPet, setParsedPet] = useState<ParsedPet | null>(null);
  const [isReading, setIsReading] = useState(false);

  const mailtoHref = useMemo(() => {
    if (!parsedPet) {
      return "mailto:hello@petdex.dev?subject=Petdex%20submission";
    }

    const subject = encodeURIComponent(
      `Petdex submission: ${parsedPet.displayName}`,
    );
    const body = encodeURIComponent(
      [
        `Pet name: ${parsedPet.displayName}`,
        `Pet id: ${parsedPet.id}`,
        `Description: ${parsedPet.description}`,
        "",
        "Attach the ZIP you validated on Petdex before sending.",
      ].join("\n"),
    );

    return `mailto:hello@petdex.dev?subject=${subject}&body=${body}`;
  }, [parsedPet]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setIsReading(true);
    setParsedPet(null);

    try {
      const zipFile = [...files].find((file) => file.name.endsWith(".zip"));
      const jsonFile = [...files].find((file) => file.name === "pet.json");
      const spriteFile = [...files].find((file) => file.name.endsWith(".webp"));

      if (zipFile) {
        const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
        const petJsonFile = zip.file("pet.json");
        const spritesheetFile = zip.file("spritesheet.webp");
        const issues: string[] = [];

        if (!petJsonFile) {
          issues.push("Missing pet.json");
        }

        if (!spritesheetFile) {
          issues.push("Missing spritesheet.webp");
        }

        const petJson = petJsonFile
          ? JSON.parse(await petJsonFile.async("string"))
          : {};
        const spriteBlob = spritesheetFile
          ? await spritesheetFile.async("blob")
          : null;

        setParsedPet({
          id: petJson.id ?? zipFile.name.replace(/\.zip$/, ""),
          displayName: petJson.displayName ?? "Untitled pet",
          description: petJson.description ?? "A Codex-compatible digital pet.",
          spritesheetUrl: spriteBlob
            ? URL.createObjectURL(spriteBlob)
            : undefined,
          issues,
        });
        return;
      }

      if (jsonFile && spriteFile) {
        const petJson = JSON.parse(await jsonFile.text());
        setParsedPet({
          id: petJson.id ?? "untitled-pet",
          displayName: petJson.displayName ?? "Untitled pet",
          description: petJson.description ?? "A Codex-compatible digital pet.",
          spritesheetUrl: URL.createObjectURL(spriteFile),
          issues: [],
        });
        return;
      }

      setParsedPet({
        id: "missing-files",
        displayName: "Missing files",
        description:
          "Upload a ZIP, or pet.json together with spritesheet.webp.",
        issues: ["Upload a complete Codex pet package."],
      });
    } finally {
      setIsReading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <label className="glass-panel flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-3xl p-8 text-center transition hover:bg-white/80">
        <input
          type="file"
          multiple
          accept=".zip,.json,.webp"
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <span className="grid size-16 place-items-center rounded-2xl bg-black text-white">
          <Upload className="size-7" />
        </span>
        <span className="mt-6 text-2xl font-medium">Upload a pet package</span>
        <span className="mt-3 max-w-md text-sm leading-6 text-[#5d5d66]">
          Drop in a ZIP with{" "}
          <code className="rounded bg-white/70 px-1 py-0.5">pet.json</code> and{" "}
          <code className="rounded bg-white/70 px-1 py-0.5">
            spritesheet.webp
          </code>
          , or select both files manually. Validation happens in your browser.
        </span>
      </label>

      <aside className="rounded-3xl border border-black/10 bg-white/76 p-5 shadow-sm shadow-blue-950/5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium text-black">
          <FileArchive className="size-4" />
          Submission check
        </div>

        {isReading ? (
          <p className="mt-6 text-sm text-[#5d5d66]">Reading package...</p>
        ) : parsedPet ? (
          <div className="mt-6 space-y-5">
            {parsedPet.spritesheetUrl ? (
              <SpritePreview src={parsedPet.spritesheetUrl} />
            ) : null}
            <div>
              <h2 className="text-xl font-medium">{parsedPet.displayName}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d5d66]">
                {parsedPet.description}
              </p>
            </div>
            {parsedPet.issues.length > 0 ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                {parsedPet.issues.join(" ")}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="size-4" />
                Looks ready to submit.
              </div>
            )}
            <a
              href={mailtoHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-black/85"
            >
              <Send className="size-4" />
              Send submission
            </a>
          </div>
        ) : (
          <p className="mt-6 text-sm leading-6 text-[#5d5d66]">
            Packages stay local until you choose to send them. Petdex checks the
            manifest and sprite file before submission.
          </p>
        )}
      </aside>
    </div>
  );
}

function SpritePreview({ src }: { src: string }) {
  const [index, setIndex] = useState(0);
  const animation = petStates[index];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % petStates.length);
    }, 1500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="w-fit rounded-2xl border border-black/10 bg-[#f7f8ff] p-3">
      <div
        className="pet-sprite-frame"
        role="img"
        aria-label="Uploaded pet animation preview"
        style={{ "--pet-scale": 0.5 } as React.CSSProperties}
      >
        <div
          className="pet-sprite"
          style={
            {
              "--sprite-url": `url(${src})`,
              "--sprite-row": animation.row,
              "--sprite-frames": animation.frames,
              "--sprite-duration": `${animation.durationMs}ms`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}
