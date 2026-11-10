import Image from "next/image";

export function MikdexBrand() {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/mikdex-mark.png"
        alt=""
        width={40}
        height={32}
        aria-hidden="true"
        className="h-8 w-10 shrink-0 object-contain"
      />
      <span className="flex flex-col items-start">
        <span className="text-nowrap text-lg font-semibold leading-tight">Mikdex AI</span>
        <span className="text-nowrap text-xs font-light text-muted-foreground">
          Finance Tracker
        </span>
      </span>
    </span>
  );
}
