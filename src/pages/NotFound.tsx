import { SEO } from "@/components/SEO";

const NotFound = () => {
  return (
    <>
      <SEO
        title="Sidan kunde inte hittas – vårdbemanning.ai"
        description="Sidan du letar efter finns inte. Gå tillbaka till startsidan för att fortsätta."
        path="/404"
        noindex
      />
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Sidan kunde inte hittas</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Tillbaka till startsidan
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
