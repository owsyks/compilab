import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return (
    <AuthForm
      demo={
        process.env.DEMO_ENABLED === "true" &&
        process.env.NODE_ENV !== "production"
      }
    />
  );
}
