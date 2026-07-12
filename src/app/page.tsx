import GraphBoard from "@/components/GraphBoard";
import { loadManifest } from "@/lib/topic";

export default function Home() {
  const manifest = loadManifest("quantum-mechanics");
  return <GraphBoard manifest={manifest} />;
}
