import Image from "next/image";

// Google's "G" mark, which Google requires on its sign-in buttons.
export function GoogleIcon() {
  return <Image src="/brand/google-g.svg" alt="" width={18} height={18} unoptimized />;
}
