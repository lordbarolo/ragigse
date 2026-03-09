import CompcareLogo from "@/components/CompcareLogo";

interface Props {
  kommun: string;
}

export default function TeaserHeader({ kommun }: Props) {
  return (
    <header className="py-10 px-5 text-center border-b border-border bg-background">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-center mb-3">
          <span className="block md:hidden"><CompcareLogo variant="wordmark" /></span>
          <span className="hidden md:block"><CompcareLogo variant="full" /></span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
          Din löneanalys är klar
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Vi har jämfört din ersättning med marknadsdata i {kommun}
        </p>
      </div>
    </header>
  );
}
