import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyORL — ΩΡΛ Χειρουργική Κλινική Αθηνών",
    short_name: "MyORL",
    description:
      "Bilingual ORL/ENT and facial surgery practice in Athens — consultation content and services.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon.png",
        sizes: "60x60",
        type: "image/png",
      },
    ],
  };
}
