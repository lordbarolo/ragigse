import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Briefcase, MapPin, Clock, FileText } from "lucide-react";
import ReferenceSlidePanel from "@/components/profile/ReferenceSlidePanel";
import { heroBackgroundStyle } from "@/lib/heroBackground";

export default function ReferenceDemo() {
  const [refPanelOpen, setRefPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4">
        <div className="flex flex-row gap-4 items-start justify-center">
          {/* Profile column */}
          <div
            className={`transition-all duration-300 w-full ${
              refPanelOpen ? "max-w-xl hidden md:block" : "max-w-2xl"
            } mx-auto space-y-5`}
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">Min dashboard</h1>
              <p className="text-sm text-muted-foreground">demo@compcare.se</p>
            </div>

            {/* Mock profile card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" /> Sjuksköterska
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> Stockholm
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" /> 5 års erfarenhet
                </div>
              </CardContent>
            </Card>

            {/* Mock reports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Mina rapporter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm text-center py-6">Inga rapporter ännu</p>
              </CardContent>
            </Card>

            {/* Reference card — clickable */}
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setRefPanelOpen(true)}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Mina referenser
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm mb-3">Inga referenser ännu</p>
                  <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); setRefPanelOpen(true); }}>
                    <UserPlus className="w-4 h-4" />
                    Bjud in referensgivare
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Slide-in panel */}
          <ReferenceSlidePanel
            open={refPanelOpen}
            onClose={() => setRefPanelOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
