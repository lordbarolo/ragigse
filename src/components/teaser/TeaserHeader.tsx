import Navbar from "@/components/Navbar";

interface Props {
  kommun: string;
}

export default function TeaserHeader({ kommun }: Props) {
  return (
    <>
      <Navbar />
      <header className="pt-24 pb-10 px-5 text-center border-b border-border bg-background">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
            Din löneanalys är klar
          </h1>
           <p className="text-body mt-2">
             Vi har jämfört din ersättning med marknadsdata i {kommun}
           </p>
        </div>
      </header>
    </>
  );
}
