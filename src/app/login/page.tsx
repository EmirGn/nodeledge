import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "sign in — nodeledge" };

export default function LoginPage() {
  return (
    <div className="board gate">
      <div className="hud hud-tl">
        <span className="wordmark">nodeledge</span>
      </div>
      <LoginForm />
      <div className="hud hud-bl">
        <span>knowledge as a graph · private to you</span>
      </div>
    </div>
  );
}
