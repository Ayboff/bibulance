/** Permanent orientation away from Bibulance for life-threatening emergencies. */
export function EmergencyBanner() {
  return (
    <aside
      className="mb-5 rounded-xl border-2 border-[#991b1b] bg-[#fef2f2] px-4 py-3 text-[#7f1d1d]"
      role="note"
      aria-label="Urgence médicale"
    >
      <p className="text-base font-bold leading-snug">
        Urgence vitale ? N’utilisez pas Bibulance.
      </p>
      <p className="mt-1 text-sm leading-snug">
        Appelez le{" "}
        <a className="font-bold underline" href="tel:15">
          15
        </a>{" "}
        (SAMU) ou le{" "}
        <a className="font-bold underline" href="tel:112">
          112
        </a>
        . Bibulance sert aux transports sanitaires programmés, pas aux
        urgences.
      </p>
    </aside>
  );
}
