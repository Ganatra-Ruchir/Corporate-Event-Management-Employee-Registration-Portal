import ElixirPortal from "@/components/elixir-portal";
import "./portal.css";
import "./discovery.css";
import "./event-notifications.css";
import "./employee-profiles.css";
import "./event-quick-actions.css";
import "./speaker-motion.css";
import "./admin-auth.css";
import "./compact-layout.css";
import "./landing.css";
// Theme files must stay last: page-level CSS loads after the layout, so these re-imports keep the palette on top.
import "./theme.css";
import "./obsidian.css";
export default function Home(){return <ElixirPortal/>;}