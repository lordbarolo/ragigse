interface Props {
  kommun: string;
  employmentType?: string;
}

export default function TeaserHeader({ kommun, employmentType }: Props) {
  const label = employmentType === "foretagare" ? "din ersättning" : "din lön";

  return (
    <header className="hero-gradient py-8 px-5 text-center">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
          Din löneanalys är klar
        </h1>
        <p className="text-sm sm:text-base text-primary-foreground/80 mt-2">
          Vi har jämfört {label} med ramavtalspriserna i {kommun}
        </p>
      </div>
    </header>
  );
}
