import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, ArrowRight } from "lucide-react";

export default function DashboardInvoiceCheck() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          Fakturakontroll
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Säkerställ att du fakturerat rätt senaste åren. Med stöd av Ai hittar vi pengar du inte visste att du saknade.
        </p>
        <Link to="/consultant/fakturakontroll/ny">
          <Button variant="outline" size="sm" className="gap-1.5">
            Starta granskning
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
